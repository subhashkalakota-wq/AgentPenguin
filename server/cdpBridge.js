/**
 * Chrome bridge: a small background process that holds the user's approved
 * remote-debugging connection to Chrome.
 *
 * The backend starts it (detached) the first time it needs Chrome. Because it is a
 * separate process, the approval survives backend restarts and new runs: the user
 * clicks "Allow" once and it keeps working until Chrome is quit or remote debugging
 * is turned off. Then the bridge exits on its own.
 *
 * Usage: node server/cdpBridge.js --launch <ws://127.0.0.1:PORT/devtools/browser/ID>
 *   (--launch starts the bridge fully detached and returns immediately)
 *
 * Security: listens on 127.0.0.1 only, and every request must carry a random token
 * that is written to server/data/cdp-bridge.json (readable only by this user).
 */
import http from 'http';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { WebSocketServer } from 'ws';
import { createRelay } from './cdpProxy.js';

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

// "--launch": start the real bridge as a fully separate process and exit at once, so the
// bridge isn't a child of the backend (stopping or restarting the backend can't take it down)
if (process.argv[2] === '--launch') {
  const child = spawn(process.execPath, [fileURLToPath(import.meta.url), process.argv[3]], { cwd: process.cwd(), detached: true, stdio: 'ignore' });
  child.unref();
  process.exit(0);
}

const DATA_DIR = path.resolve('server/data');
export const BRIDGE_FILE = path.join(DATA_DIR, 'cdp-bridge.json');
const LOG_FILE = path.join(DATA_DIR, 'cdp-bridge.log');

const upstreamUrl = process.argv[2];
const token = crypto.randomBytes(24).toString('hex');
const info = { pid: process.pid, port: 0, token, upstream: upstreamUrl, state: 'starting', error: null, startedAt: new Date().toISOString() };

fs.mkdirSync(DATA_DIR, { recursive: true });
const log = (m) => { try { fs.appendFileSync(LOG_FILE, `${new Date().toISOString()} ${m}\n`); } catch { /* ignore */ } };
const save = () => {
  const tmp = `${BRIDGE_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(info), { mode: 0o600 });
  fs.renameSync(tmp, BRIDGE_FILE);
};
const exit = (code) => {
  try {
    // Only remove the file if it's still ours (a newer bridge may have replaced it)
    if (JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8')).pid === process.pid) fs.unlinkSync(BRIDGE_FILE);
  } catch { /* ignore */ }
  log(`Bridge ${process.pid} exiting.`);
  setTimeout(() => process.exit(code), 50);
};

if (!/^ws:\/\/(127\.0\.0\.1|localhost):\d+\//.test(upstreamUrl || '')) {
  log(`Refusing to start: bad upstream ${upstreamUrl}`);
  process.exit(1);
}

const authorized = (req) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  const given = req.headers['x-bridge-token'] || url.searchParams.get('token') || url.pathname.split('/').pop();
  return typeof given === 'string' && given.length === token.length
    && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token));
};

const relay = createRelay(upstreamUrl, log);
relay.onClose(() => {
  log('Chrome closed the connection (Chrome quit or remote debugging was turned off).');
  exit(0);
});

const server = http.createServer((req, res) => {
  if (!authorized(req)) { res.writeHead(403).end(); return; }
  if (req.url.startsWith('/status')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ state: info.state, upstream: info.upstream, error: info.error, hasClient: relay.hasClient(), pid: process.pid }));
    return;
  }
  if (req.url.startsWith('/shutdown') && req.method === 'POST') {
    res.writeHead(200).end();
    relay.close();
    exit(0);
    return;
  }
  res.writeHead(404).end();
});

const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 * 1024 });
server.on('upgrade', (req, socket, head) => {
  if (info.state !== 'ready' || !req.url.startsWith('/devtools/browser/') || !authorized(req)) {
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => {
    log('Penguin connected.');
    relay.attachClient(ws);
    ws.on('close', () => log('Penguin disconnected; keeping the Chrome connection open.'));
  });
});

server.listen(0, '127.0.0.1', async () => {
  info.port = server.address().port;
  info.state = 'waiting';
  save();
  log(`Bridge ${process.pid} on port ${info.port}, waiting for Chrome to allow ${upstreamUrl.replace(/\/devtools.*/, '')}`);
  try {
    await relay.ready;
    info.state = 'ready';
    save();
  } catch (err) {
    info.state = 'failed';
    info.error = err.message;
    save();
    log(`Failed: ${err.message}`);
    // Leave the status readable briefly so the backend can report the reason
    setTimeout(() => { relay.close(); exit(1); }, 5000);
  }
});

process.on('SIGTERM', () => { log('Stopped (SIGTERM).'); relay.close(); exit(0); });
// Ctrl+C / a closed terminal belong to the backend, not to the bridge
process.on('SIGINT', () => log('Ignored SIGINT.'));
process.on('SIGHUP', () => log('Ignored SIGHUP.'));
