/**
 * CDP relay between Playwright and the user's own Chrome (used by cdpBridge.js).
 *
 * Why it exists:
 * - Chrome (remote debugging via chrome://inspect) asks the user to "Allow" every
 *   new debugging connection. The relay keeps ONE approved upstream connection, and
 *   Playwright clients come and go through it, so the user approves once while
 *   Chrome stays open — not once per run or per backend restart.
 * - Playwright's connectOverCDP waits until every open tab answers. Tabs that
 *   Chrome has put to sleep (memory saver) never answer, so connecting hangs.
 *   The relay probes each existing tab and hides the ones that don't respond,
 *   plus Chrome-internal "browser_ui" targets.
 * - It refuses Browser.close / Browser.crash so the agent can never close the
 *   user's real browser.
 * - When a client disconnects it undoes what automation turned on (auto-attach with
 *   "wait for debugger", download redirection, attached sessions), so the user's
 *   Chrome behaves normally until the next run.
 */
import { WebSocket } from 'ws';

const PROBE_BASE = 2_000_000_000; // the relay's own message ids
const PROBE_TIMEOUT_MS = 3000;
const APPROVAL_TIMEOUT_MS = 120000;
const BLOCKED_METHODS = new Set(['Browser.close', 'Browser.crash']);
const HIDDEN_TYPES = new Set(['browser_ui', 'other']);

/**
 * Opens the upstream connection to Chrome.
 * @returns relay { ready: Promise (resolves once Chrome allows), attachClient(ws), close(), onClose(cb) }
 */
export function createRelay(upstreamUrl, log = () => {}) {
  const state = {
    upstream: null,
    client: null,
    gen: 0,                      // increments per client so late replies to an old client are dropped
    nextUpId: 1,                 // upstream ids for client requests (remapped)
    idMap: new Map(),            // upstream id -> { gen, id }
    nextProbeId: PROBE_BASE,
    probes: new Map(),           // id -> resolve
    hiddenSessions: new Set(),
    hiddenTargets: new Set(),
    pendingSessions: new Map(),  // sessionId -> buffered messages while probing
    clientSessions: new Set(),   // sessions attached for the current client
    staleSessions: new Set(),    // sessions from a previous client (being detached)
    closeHandlers: [],
    closed: false,
  };

  const sendUp = (msg) => state.upstream?.readyState === WebSocket.OPEN && state.upstream.send(JSON.stringify(msg));
  const sendClient = (raw) => state.client?.readyState === WebSocket.OPEN && state.client.send(raw);
  const fire = (method, params = {}, sessionId) => sendUp({ id: state.nextProbeId++, method, params, ...(sessionId ? { sessionId } : {}) });

  const probe = (method, params = {}, sessionId, timeout = PROBE_TIMEOUT_MS) => new Promise((resolve) => {
    const id = state.nextProbeId++;
    const timer = setTimeout(() => { state.probes.delete(id); resolve(null); }, timeout);
    state.probes.set(id, (reply) => { clearTimeout(timer); resolve(reply); });
    sendUp({ id, method, params, ...(sessionId ? { sessionId } : {}) });
  });

  const hide = (sessionId, targetId, waiting) => {
    state.hiddenSessions.add(sessionId);
    if (targetId) state.hiddenTargets.add(targetId);
    if (waiting) fire('Runtime.runIfWaitingForDebugger', {}, sessionId);
    fire('Target.detachFromTarget', { sessionId });
  };

  // Undo automation state left by a client that went away
  const releaseClient = () => {
    const sessions = [...state.clientSessions];
    state.clientSessions.clear();
    sessions.forEach(s => state.staleSessions.add(s));
    fire('Target.setAutoAttach', { autoAttach: false, waitForDebuggerOnStart: false, flatten: true });
    fire('Target.setDiscoverTargets', { discover: false });
    fire('Browser.setDownloadBehavior', { behavior: 'default' });
    for (const s of sessions) fire('Runtime.runIfWaitingForDebugger', {}, s);
    for (const s of sessions) fire('Target.detachFromTarget', { sessionId: s });
    state.pendingSessions.clear();
    if (sessions.length) log(`Released ${sessions.length} tab session${sessions.length === 1 ? '' : 's'} from the last run.`);
  };

  const handleUpstream = (raw) => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    // Replies to the relay's own probes / cleanup commands
    if (msg.id >= PROBE_BASE) {
      state.probes.get(msg.id)?.(msg);
      state.probes.delete(msg.id);
      return;
    }
    // Replies to client requests: restore the client's id, drop replies meant for an old client
    if (msg.id != null) {
      const entry = state.idMap.get(msg.id);
      state.idMap.delete(msg.id);
      if (!entry || entry.gen !== state.gen) return;
      msg.id = entry.id;
      sendClient(JSON.stringify(msg));
      return;
    }

    const p = msg.params || {};
    if (msg.method === 'Target.detachedFromTarget') {
      state.clientSessions.delete(p.sessionId);
      if (state.staleSessions.delete(p.sessionId) || state.hiddenSessions.has(p.sessionId)) return;
    }
    // Anything about a hidden tab or an old client's session is dropped
    if (msg.sessionId && (state.hiddenSessions.has(msg.sessionId) || state.staleSessions.has(msg.sessionId))) return;
    if (/^Target\.(targetInfoChanged|targetDestroyed|targetCrashed)$/.test(msg.method || '')
      && state.hiddenTargets.has(p.targetInfo?.targetId || p.targetId)) return;

    // Buffer messages for a tab that's still being probed
    if (msg.sessionId && state.pendingSessions.has(msg.sessionId)) {
      state.pendingSessions.get(msg.sessionId).push(raw);
      return;
    }

    if (msg.method === 'Target.attachedToTarget') {
      const info = p.targetInfo || {};
      if (!state.client) { // nobody to hand it to: let it run and let go
        if (p.waitingForDebugger) fire('Runtime.runIfWaitingForDebugger', {}, p.sessionId);
        fire('Target.detachFromTarget', { sessionId: p.sessionId });
        return;
      }
      if (HIDDEN_TYPES.has(info.type)) {
        hide(p.sessionId, info.targetId, p.waitingForDebugger);
        return;
      }
      state.clientSessions.add(p.sessionId);
      // Existing (not newly opened) top-level tabs: make sure they respond first
      if (info.type === 'page' && !msg.sessionId && !p.waitingForDebugger) {
        const gen = state.gen;
        state.pendingSessions.set(p.sessionId, []);
        probe('Runtime.evaluate', { expression: '1', returnByValue: true }, p.sessionId).then((reply) => {
          const buffered = state.pendingSessions.get(p.sessionId) || [];
          state.pendingSessions.delete(p.sessionId);
          if (gen !== state.gen) return;
          if (!reply || reply.error) {
            log(`Skipping an unresponsive tab (${(info.url || '').replace(/^(https?:\/\/[^/]+).*/, '$1') || info.type}) — it's probably asleep.`);
            state.clientSessions.delete(p.sessionId);
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

  const handleClient = (client, raw) => {
    if (client !== state.client) return;
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (BLOCKED_METHODS.has(msg.method)) {
      // Never let automation close the user's own browser
      sendClient(JSON.stringify({ id: msg.id, result: {} }));
      return;
    }
    const upId = state.nextUpId++;
    if (state.nextUpId >= PROBE_BASE) state.nextUpId = 1;
    state.idMap.set(upId, { gen: state.gen, id: msg.id });
    msg.id = upId;
    sendUp(msg);
  };

  const shutdown = () => {
    if (state.closed) return;
    state.closed = true;
    try { state.client?.close(); } catch { /* ignore */ }
    state.closeHandlers.forEach(fn => fn());
  };

  const ready = (async () => {
    state.upstream = new WebSocket(upstreamUrl, { perMessageDeflate: false, maxPayload: 512 * 1024 * 1024 });
    await new Promise((resolve, reject) => {
      state.upstream.once('open', resolve);
      state.upstream.once('error', reject);
    });
    state.upstream.on('message', (data) => handleUpstream(data.toString()));
    state.upstream.on('close', shutdown);
    state.upstream.on('error', () => {});

    log('Waiting for Chrome to allow the connection.');
    const approval = await probe('Browser.getVersion', {}, undefined, APPROVAL_TIMEOUT_MS);
    if (!approval) throw new Error('Chrome did not allow the connection within 2 minutes. Click "Allow" in Chrome when it asks, then try again.');
    log(`Chrome allowed the connection (${approval.result?.product || 'Chrome'}).`);
  })();

  return {
    ready,
    /** Hands the upstream connection to a Playwright client; replaces any previous client. */
    attachClient(ws) {
      if (state.client) {
        const old = state.client;
        state.client = null;
        releaseClient();
        try { old.close(); } catch { /* ignore */ }
      }
      state.gen++;
      state.client = ws;
      state.hiddenSessions.clear();
      state.hiddenTargets.clear();
      ws.on('message', (data) => handleClient(ws, data.toString()));
      ws.on('close', () => {
        if (state.client !== ws) return;
        state.client = null;
        state.gen++;
        releaseClient();
      });
    },
    hasClient: () => Boolean(state.client),
    onClose(fn) { state.closeHandlers.push(fn); },
    close() {
      try { state.upstream?.close(); } catch { /* ignore */ }
      shutdown();
    },
  };
}
