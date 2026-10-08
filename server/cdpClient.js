import { chromium } from 'playwright';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getProxiedEndpoint } from './cdpProxy.js';

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

// Prefer the user's own Chrome; only use a custom http endpoint if one was configured
export async function connectToUserChrome(customUrl, log) {
  const ws = userChromeEndpoint();
  let lastError = 'Remote debugging is not turned on in your Chrome. Open chrome://inspect/#remote-debugging and enable it.';
  if (ws) {
    try {
      // Relay: one approved connection, skips sleeping tabs, can't close Chrome
      const endpoint = await getProxiedEndpoint(ws, log);
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
