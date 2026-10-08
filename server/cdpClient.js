import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

export const DEFAULT_CDP_URL = 'http://localhost:9222';

// Chrome's default ("Default" profile) user-data directory per OS
function defaultChromeDataDir() {
  const home = os.homedir();
  if (process.platform === 'darwin') return path.join(home, 'Library/Application Support/Google/Chrome');
  if (process.platform === 'win32') return path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData/Local'), 'Google/Chrome/User Data');
  return path.join(home, '.config/google-chrome');
}

/**
 * When remote debugging is switched on inside the user's own Chrome
 * (chrome://inspect/#remote-debugging), Chrome writes DevToolsActivePort into its
 * user-data dir: line 1 = port, line 2 = browser websocket path. Connecting there
 * attaches to the user's normal browser and profile (all their sign-ins).
 */
export function userChromeEndpoint() {
  try {
    const file = path.join(defaultChromeDataDir(), 'DevToolsActivePort');
    const [port, wsPath] = fs.readFileSync(file, 'utf8').split('\n').map(s => s.trim());
    if (port && wsPath) return `ws://127.0.0.1:${port}${wsPath}`;
  } catch { /* setting is off or Chrome not running */ }
  return null;
}

// ---- Chrome bridge (server/cdpBridge.js) ----
// A separate background process holds the approved connection to Chrome, so the user
// clicks "Allow" once and it keeps working across runs and backend restarts.
const BRIDGE_SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cdpBridge.js');
const BRIDGE_FILE = path.resolve('server/data/cdp-bridge.json');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function readBridgeFile() {
  try { return JSON.parse(fs.readFileSync(BRIDGE_FILE, 'utf8')); } catch { return null; }
}

// Live status of the bridge, or null when none is running
async function bridgeStatus() {
  const file = readBridgeFile();
  if (!file?.port || !file.token) return null;
  try { process.kill(file.pid, 0); } catch { return null; }
  try {
    const res = await fetch(`http://127.0.0.1:${file.port}/status`, { headers: { 'x-bridge-token': file.token }, signal: AbortSignal.timeout(2000) });
    if (!res.ok) return null;
    return { ...file, ...(await res.json()) };
  } catch {
    return null;
  }
}

const bridgeWsUrl = (b) => `ws://127.0.0.1:${b.port}/devtools/browser/${b.token}`;

/** True when a bridge is connected and approved (so attaching won't prompt the user). */
export async function bridgeReady() {
  const b = await bridgeStatus();
  return Boolean(b && b.state === 'ready' && b.upstream === userChromeEndpoint());
}

/**
 * Returns a ws endpoint for Playwright through the bridge, starting the bridge when
 * needed. Only a new bridge makes Chrome ask the user to "Allow".
 */
export async function getBridgeEndpoint(upstream, log = () => {}) {
  let b = await bridgeStatus();
  if (b && b.upstream !== upstream) {
    // Chrome restarted (new debugging address): retire the old bridge
    await fetch(`http://127.0.0.1:${b.port}/shutdown`, { method: 'POST', headers: { 'x-bridge-token': b.token } }).catch(() => {});
    b = null;
  }
  if (b?.state === 'ready') return bridgeWsUrl(b);

  if (!b) {
    const child = spawn(process.execPath, [BRIDGE_SCRIPT, upstream], { cwd: process.cwd(), detached: true, stdio: 'ignore' });
    child.unref();
  }
  log('Click "Allow" in Chrome. You only need to do this once — Penguin stays connected until you quit Chrome.');

  const started = Date.now();
  let seen = Boolean(b);
  while (Date.now() - started < 130000) {
    await sleep(500);
    b = await bridgeStatus();
    if (b) seen = true;
    if (b?.state === 'ready') return bridgeWsUrl(b);
    if (b?.state === 'failed') throw new Error(b.error || 'Chrome did not allow the connection.');
    if (!b && (seen || Date.now() - started > 8000)) {
      throw new Error('Chrome closed the connection. If you clicked "Deny", click Connect again and choose "Allow".');
    }
  }
  throw new Error('Chrome did not allow the connection within 2 minutes. Click "Allow" in Chrome when it asks, then try again.');
}

// Prefer the user's own Chrome; only use a custom http endpoint if one was configured
export async function connectToUserChrome(customUrl, log) {
  const ws = userChromeEndpoint();
  let lastError = 'Remote debugging is not turned on in your Chrome. Open chrome://inspect/#remote-debugging and enable it.';
  if (ws) {
    try {
      // Bridge: one approved connection for as long as Chrome is open; skips sleeping tabs, can't close Chrome
      const endpoint = await getBridgeEndpoint(ws, log);
      const r = await attach(endpoint);
      if (r.success) return r;
      lastError = r.error;
    } catch (err) {
      lastError = err.message;
    }
  }
  if (customUrl && customUrl !== DEFAULT_CDP_URL) {
    const r = await connectToChromeCDP(customUrl);
    if (r.success) return r;
    lastError = r.error;
  }
  return { success: false, error: lastError, browser: null, page: null };
}

async function attach(endpoint) {
  try {
    const browser = await chromium.connectOverCDP(endpoint, { timeout: 60000 });
    const ctx = browser.contexts()[0];
    if (!ctx) return { success: false, error: 'No Chrome window found.', browser: null, page: null };
    const pages = ctx.pages();
    const page = pages.find(p => /linkedin\.com|naukri\.com|indeed\.com/.test(p.url())) || pages[0] || await ctx.newPage();
    const title = await page.title().catch(() => 'Chrome Tab');
    return { success: true, browser, context: ctx, page, tabTitle: title || 'Chrome Tab', url: page.url(), port: 9222 };
  } catch (err) {
    return {
      success: false,
      error: /ECONNREFUSED|connect/i.test(err.message)
        ? 'Chrome isn\'t accepting the connection. Make sure remote debugging is on and click "Allow" if Chrome asks.'
        : `Could not attach to Chrome: ${err.message.split('\n')[0]}`,
      browser: null,
      page: null,
    };
  }
}

/**
 * Connects to the user's running Chrome browser via Chrome DevTools Protocol (CDP).
 * 
 * Chrome must be launched with:
 *   google-chrome --remote-debugging-port=9222 --no-first-run --no-default-browser-check
 * Or on Mac:
 *   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
 *     --remote-debugging-port=9222 --no-first-run
 */
export async function connectToChromeCDP(cdpUrl = 'http://localhost:9222') {
  // First, verify Chrome is reachable via HTTP /json endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    
    const probeRes = await fetch(`${cdpUrl}/json/version`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!probeRes.ok) {
      return {
        success: false,
        error: `Chrome DevTools Protocol HTTP probe failed (status ${probeRes.status}). Make sure Chrome is running with --remote-debugging-port=9222`,
        browser: null,
        page: null
      };
    }

    const versionInfo = await probeRes.json();
    console.log('[CDP] Chrome version probe OK:', versionInfo.Browser);
  } catch (probeErr) {
    if (probeErr.name === 'AbortError') {
      return {
        success: false,
        error: `Chrome DevTools Protocol timed out at ${cdpUrl}. Is Chrome running with --remote-debugging-port=9222?`,
        browser: null,
        page: null
      };
    }
    return {
      success: false,
      error: `Cannot reach Chrome at ${cdpUrl}: ${probeErr.message}. Launch Chrome with: --remote-debugging-port=9222`,
      browser: null,
      page: null
    };
  }

  // Playwright can't attach to a Chrome with zero tabs ("Browser context
  // management is not supported"), so make sure one page exists first.
  try {
    const list = await (await fetch(`${cdpUrl}/json/list`)).json();
    if (!list.some(t => t.type === 'page')) {
      await fetch(`${cdpUrl}/json/new?about:blank`, { method: 'PUT' });
    }
  } catch { /* best effort */ }

  // Now connect with Playwright
  try {
    const browser = await chromium.connectOverCDP(cdpUrl, { timeout: 10000 });
    const contexts = browser.contexts();

    if (contexts.length === 0) {
      return {
        success: false,
        error: 'No browser contexts found. Please make sure Chrome has at least one tab open.',
        browser: null,
        page: null
      };
    }

    const defaultContext = contexts[0];
    const pages = defaultContext.pages();

    if (pages.length === 0) {
      const newPage = await defaultContext.newPage();
      return {
        success: true,
        browser,
        context: defaultContext,
        page: newPage,
        tabTitle: 'New Tab',
        url: 'about:blank',
        port: 9222
      };
    }

    // Prefer a LinkedIn tab; fallback to first tab
    let linkedinPage = pages.find(p => p.url().includes('linkedin.com'));
    if (!linkedinPage) linkedinPage = pages[0];

    const title = await linkedinPage.title().catch(() => 'Chrome Tab');
    const url = linkedinPage.url();

    return {
      success: true,
      browser,
      context: defaultContext,
      page: linkedinPage,
      tabTitle: title || 'Chrome Tab',
      url,
      port: 9222
    };
  } catch (err) {
    return {
      success: false,
      error: `Playwright could not attach to Chrome over CDP at ${cdpUrl}: ${err.message}`,
      browser: null,
      page: null
    };
  }
}
