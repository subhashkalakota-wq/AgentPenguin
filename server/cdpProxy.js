/**
 * Local CDP relay between Playwright and the user's own Chrome.
 *
 * Why it exists:
 * - Chrome (remote debugging via chrome://inspect) asks the user to "Allow" every
 *   new debugging connection. The relay keeps ONE upstream connection open, so the
 *   user approves once per server run, and Playwright can reconnect freely.
 * - Playwright's connectOverCDP waits until every open tab answers. Tabs that
 *   Chrome has put to sleep (memory saver) never answer, so connecting hangs.
 *   The relay probes each existing tab and hides the ones that don't respond,
 *   plus Chrome-internal "browser_ui" targets.
 * - It refuses Browser.close / Browser.crash so the agent can never close the
 *   user's real browser.
 */
import { WebSocketServer, WebSocket } from 'ws';

const PROBE_BASE = 2_000_000_000; // our own message ids; Playwright's start at 1
const PROBE_TIMEOUT_MS = 3000;
const BLOCKED_METHODS = new Set(['Browser.close', 'Browser.crash']);
const HIDDEN_TYPES = new Set(['browser_ui', 'other']);

let proxy = null; // singleton { upstreamUrl, port, wss, upstream, ready }

function createProxy(upstreamUrl, log) {
  const state = {
    upstreamUrl,
    upstream: null,
    client: null,
    wss: null,
    port: 0,
    nextProbeId: PROBE_BASE,
    probes: new Map(),      // id -> resolve
    hiddenSessions: new Set(),
    hiddenTargets: new Set(),
    pendingSessions: new Map(), // sessionId -> buffered messages while probing
    closed: false,
  };

  const sendUp = (msg) => state.upstream?.readyState === WebSocket.OPEN && state.upstream.send(JSON.stringify(msg));
  const sendClient = (raw) => state.client?.readyState === WebSocket.OPEN && state.client.send(raw);

  const probe = (method, params = {}, sessionId) => new Promise((resolve) => {
    const id = state.nextProbeId++;
    const timer = setTimeout(() => { state.probes.delete(id); resolve(null); }, PROBE_TIMEOUT_MS);
    state.probes.set(id, (reply) => { clearTimeout(timer); resolve(reply); });
    sendUp({ id, method, params, ...(sessionId ? { sessionId } : {}) });
  });

  const hide = (sessionId, targetId, waiting) => {
    state.hiddenSessions.add(sessionId);
    if (targetId) state.hiddenTargets.add(targetId);
    if (waiting) sendUp({ id: state.nextProbeId++, method: 'Runtime.runIfWaitingForDebugger', sessionId });
    sendUp({ id: state.nextProbeId++, method: 'Target.detachFromTarget', params: { sessionId } });
  };

  const handleUpstream = (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // Replies to the relay's own probes
    if (msg.id >= PROBE_BASE) {
      state.probes.get(msg.id)?.(msg);
      state.probes.delete(msg.id);
      return;
    }

    // Anything about a hidden tab is dropped
    if (msg.sessionId && state.hiddenSessions.has(msg.sessionId)) return;
    const p = msg.params || {};
    if ((msg.method === 'Target.detachedFromTarget' && state.hiddenSessions.has(p.sessionId))
      || (/^Target\.(targetInfoChanged|targetDestroyed|targetCrashed)$/.test(msg.method || '')
        && state.hiddenTargets.has(p.targetInfo?.targetId || p.targetId))) {
      return;
    }

    // Buffer messages for a tab that's still being probed
    if (msg.sessionId && state.pendingSessions.has(msg.sessionId)) {
      state.pendingSessions.get(msg.sessionId).push(raw);
      return;
    }

    if (msg.method === 'Target.attachedToTarget') {
      const info = p.targetInfo || {};
      if (HIDDEN_TYPES.has(info.type)) {
        hide(p.sessionId, info.targetId, p.waitingForDebugger);
        return;
      }
      // Existing (not newly opened) top-level tabs: make sure they respond first
      if (info.type === 'page' && !msg.sessionId && !p.waitingForDebugger) {
        state.pendingSessions.set(p.sessionId, []);
        probe('Runtime.evaluate', { expression: '1', returnByValue: true }, p.sessionId).then((reply) => {
          const buffered = state.pendingSessions.get(p.sessionId) || [];
          state.pendingSessions.delete(p.sessionId);
          if (!reply || reply.error) {
            log?.(`Skipping an unresponsive tab (${(info.url || '').replace(/^(https?:\/\/[^/]+).*/, '$1') || info.type}) — it's probably asleep.`);
            hide(p.sessionId, info.targetId, false);
            return;
          }
          sendClient(raw);
          buffered.forEach(sendClient);
        });
        return;
      }
    }

    sendClient(raw);
  };

  const handleClient = (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (BLOCKED_METHODS.has(msg.method)) {
      // Never let automation close the user's own browser
      sendClient(JSON.stringify({ id: msg.id, result: {} }));
      return;
    }
    if (state.upstream?.readyState === WebSocket.OPEN) state.upstream.send(raw.toString());
  };

  /** Opens the upstream connection and waits for Chrome to accept it (user clicks Allow). */
  state.ready = (async () => {
    state.upstream = new WebSocket(upstreamUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
    await new Promise((resolve, reject) => {
      state.upstream.once('open', resolve);
      state.upstream.once('error', reject);
    });
    state.upstream.on('message', (data) => handleUpstream(data.toString()));
    state.upstream.on('close', () => {
      state.closed = true;
      state.client?.close();
      if (proxy === state) proxy = null;
    });

    log?.('Waiting for Chrome to allow the connection — click "Allow" in Chrome if it asks.');
    const approval = await new Promise((resolve) => {
      const id = state.nextProbeId++;
      const timer = setTimeout(() => { state.probes.delete(id); resolve(null); }, 120000);
      state.probes.set(id, (reply) => { clearTimeout(timer); resolve(reply); });
      sendUp({ id, method: 'Browser.getVersion' });
    });
    if (!approval) throw new Error('Chrome did not allow the connection within 2 minutes. Click "Allow" in Chrome when it asks, then try again.');

    state.wss = new WebSocketServer({ host: '127.0.0.1', port: 0, maxPayload: 512 * 1024 * 1024 });
    await new Promise((resolve) => state.wss.once('listening', resolve));
    state.port = state.wss.address().port;
    state.wss.on('connection', (client) => {
      // One Playwright client at a time; a reconnect replaces the old one
      state.client?.close();
      state.client = client;
      state.hiddenSessions.clear();
      state.hiddenTargets.clear();
      state.pendingSessions.clear();
      client.on('message', (data) => handleClient(data.toString()));
    });
    return `ws://127.0.0.1:${state.port}/devtools/browser/agent-penguin`;
  })();

  return state;
}

/** Returns a local ws endpoint that relays to the user's Chrome (reused while alive). */
export async function getProxiedEndpoint(upstreamUrl, log) {
  if (proxy && (proxy.upstreamUrl !== upstreamUrl || proxy.closed)) {
    try { proxy.upstream?.close(); proxy.wss?.close(); } catch { /* ignore */ }
    proxy = null;
  }
  if (!proxy) proxy = createProxy(upstreamUrl, log);
  try {
    return await proxy.ready;
  } catch (err) {
    try { proxy?.upstream?.close(); proxy?.wss?.close(); } catch { /* ignore */ }
    proxy = null;
    throw err;
  }
}
