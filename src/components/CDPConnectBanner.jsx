import React, { useState } from 'react';
import {
  WifiOff,
  Terminal,
  Copy,
  CheckCircle2,
  Loader,
  Globe2,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';

const MAC_CMD  = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --no-first-run`;
const LIN_CMD  = `google-chrome --remote-debugging-port=9222 --no-first-run`;
const WIN_CMD  = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --no-first-run`;

export default function CDPConnectBanner({ cdpStatus, onTestCDP }) {
  const [launching, setLaunching]   = useState(false);
  const [copied, setCopied]         = useState(false);
  const [launchMsg, setLaunchMsg]   = useState('');
  const [launchErr, setLaunchErr]   = useState('');
  const [manualCmd, setManualCmd]   = useState('');
  const [dismissed, setDismissed]   = useState(false);

  // Don't show if connected or user dismissed
  if (cdpStatus?.connected || dismissed) return null;

  const handleCopy = (cmd) => {
    navigator.clipboard.writeText(cmd).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleLaunchChrome = async () => {
    setLaunching(true);
    setLaunchMsg('');
    setLaunchErr('');
    setManualCmd('');
    try {
      const res = await fetch('http://localhost:3001/api/cdp/launch', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setLaunchMsg(data.message || 'Chrome launched! Connecting in ~2s…');
        // Auto test after 3s
        setTimeout(() => {
          onTestCDP && onTestCDP();
          setLaunching(false);
        }, 3000);
      } else {
        setLaunchErr(data.error || 'Could not launch Chrome automatically.');
        if (data.manualCmd) setManualCmd(data.manualCmd);
        setLaunching(false);
      }
    } catch (e) {
      setLaunchErr('Backend server not running. Start it with: npm run server');
      setLaunching(false);
    }
  };

  return (
    <div className="cdp-banner">
      <div className="cdp-banner-header">
        <div className="cdp-banner-title">
          <WifiOff size={16} style={{ color: '#f59e0b' }} />
          <strong>Chrome DevTools Protocol — Not Connected</strong>
        </div>
        <button className="cdp-banner-dismiss" onClick={() => setDismissed(true)} title="Dismiss">
          <X size={14} />
        </button>
      </div>

      <p className="cdp-banner-desc">
        The agent needs Chrome running with <code>--remote-debugging-port=9222</code> to automate Easy Apply.<br/>
        Click <strong>Auto-Launch Chrome</strong> below, or run the command manually.
      </p>

      <div className="cdp-banner-actions">
        {/* Auto Launch Button */}
        <button
          className="btn-cdp-launch"
          onClick={handleLaunchChrome}
          disabled={launching}
        >
          {launching
            ? <><Loader size={15} style={{ animation: 'spin 1s linear infinite' }} /> Launching…</>
            : <><Globe2 size={15} /> Auto-Launch Chrome + Connect</>
          }
        </button>

        {/* Test/Refresh */}
        <button className="btn-cdp-test" onClick={onTestCDP} disabled={launching}>
          <RefreshCw size={14} />
          Test Connection
        </button>
      </div>

      {/* Success message */}
      {launchMsg && (
        <div className="cdp-banner-msg success">
          <CheckCircle2 size={14} /> {launchMsg}
        </div>
      )}

      {/* Error + manual command */}
      {launchErr && (
        <div className="cdp-banner-msg error">
          <AlertTriangle size={14} /> {launchErr}
        </div>
      )}

      {/* Manual command section */}
      <div className="cdp-manual-section">
        <div className="cdp-manual-title">
          <Terminal size={13} />
          <span>Or run manually in Terminal:</span>
        </div>
        <div className="cdp-cmd-box">
          <code className="cdp-cmd-text">{manualCmd || MAC_CMD}</code>
          <button
            className="cdp-copy-btn"
            onClick={() => handleCopy(manualCmd || MAC_CMD)}
            title="Copy command"
          >
            {copied ? <CheckCircle2 size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
