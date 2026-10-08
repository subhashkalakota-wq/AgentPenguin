import React, { useState } from 'react';
import {
  X,
  Apple,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  Play,
  CheckCircle2,
  Info,
  Laptop
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';

export default function HowToRunModal({ isOpen, onClose }) {
  const [activeOS, setActiveOS] = useState('mac'); // 'mac' | 'windows'
  const [copiedMac, setCopiedMac] = useState(false);
  const [copiedWin, setCopiedWin] = useState(false);
  const [copiedWin32, setCopiedWin32] = useState(false);

  if (!isOpen) return null;

  const macCommand = `/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/chrome_dev_test"`;
  const winCommand = `"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\chrome_dev_test"`;
  const win32Command = `"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\\chrome_dev_test"`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'mac') {
      setCopiedMac(true);
      setTimeout(() => setCopiedMac(false), 2000);
    } else if (type === 'win') {
      setCopiedWin(true);
      setTimeout(() => setCopiedWin(false), 2000);
    } else if (type === 'win32') {
      setCopiedWin32(true);
      setTimeout(() => setCopiedWin32(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="modal-card how-to-run-card animate-slide-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 760, maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Modal Header */}
        <div className="how-to-header">
          <div className="how-to-title-group">
            <PenguinAvatar mode="mini" className="penguin-modal-icon" />
            <div>
              <h2 className="modal-title">How to Run Penguin AI Agent</h2>
              <p className="modal-subtitle">
                Step-by-step setup guide for macOS &amp; Windows autonomous Chrome CDP automation
              </p>
            </div>
          </div>
          <button className="icon-btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* OS Switcher Tabs */}
        <div className="os-tabs-bar">
          <button
            className={`os-tab-btn ${activeOS === 'mac' ? 'active' : ''}`}
            onClick={() => setActiveOS('mac')}
          >
            <Apple size={18} />
            <span>macOS Setup</span>
          </button>
          <button
            className={`os-tab-btn ${activeOS === 'windows' ? 'active' : ''}`}
            onClick={() => setActiveOS('windows')}
          >
            <Laptop size={18} />
            <span>Windows Setup</span>
          </button>
        </div>

        {/* OS Specific Instructions */}
        <div className="os-content-body">
          {activeOS === 'mac' ? (
            <div className="guide-steps">
              {/* Step 1 */}
              <div className="guide-step-item">
                <div className="step-badge">1</div>
                <div className="step-details">
                  <h4>Launch Chrome with Remote Debugging (Port 9222)</h4>
                  <p>
                    Open your <strong>Terminal</strong> app on macOS (press <code>Cmd + Space</code>, type <em>Terminal</em>, and hit Enter), then paste and run:
                  </p>
                  <div className="code-box-wrapper">
                    <pre className="code-block"><code>{macCommand}</code></pre>
                    <button
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(macCommand, 'mac')}
                      title="Copy to clipboard"
                    >
                      {copiedMac ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      <span>{copiedMac ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="tip-note">
                    <Info size={14} />
                    <span>This opens a dedicated, isolated Chrome session ready for Penguin to control.</span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="guide-step-item">
                <div className="step-badge">2</div>
                <div className="step-details">
                  <h4>Sign in to LinkedIn in that Chrome Window</h4>
                  <p>
                    In the Chrome window that just opened, go to <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">linkedin.com</a> and sign in to your LinkedIn account.
                  </p>
                  <p className="sub-p">
                    Ensure your 2-step verification is complete so you stay logged in.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="guide-step-item">
                <div className="step-badge">3</div>
                <div className="step-details">
                  <h4>Verify CDP Connection in Penguin AI</h4>
                  <p>
                    Look at the top status bar in this dashboard. The <strong>CDP Status</strong> pill should show a green dot with <strong>Connected</strong>.
                  </p>
                  <p className="sub-p">
                    If it says disconnected, simply click the <strong>Refresh</strong> icon next to CDP in the header to re-probe port 9222.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="guide-step-item">
                <div className="step-badge">4</div>
                <div className="step-details">
                  <h4>Set Your Target Roles &amp; Resume Info</h4>
                  <p>
                    Click the <strong>Config</strong> button (top right). Enter your target roles (e.g., <em>Frontend Engineer, Full Stack Engineer</em>), upload your PDF resume, and adjust your application quota.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="guide-step-item">
                <div className="step-badge">5</div>
                <div className="step-details">
                  <h4>Click "Run Penguin" &amp; Pick Your Platforms</h4>
                  <p>
                    Hit the <strong>Run Penguin</strong> button, choose LinkedIn, Naukri and/or Indeed. Penguin will:
                  </p>
                  <ul className="guide-checklist">
                    <li><CheckCircle2 size={13} className="text-teal" /> Check that each chosen site is open and signed in, in Chrome.</li>
                    <li><CheckCircle2 size={13} className="text-teal" /> Search each site and click its quick-apply button (Easy Apply on LinkedIn, Apply on Naukri, Easily apply on Indeed).</li>
                    <li><CheckCircle2 size={13} className="text-teal" /> Attach your resume and autofill contact info.</li>
                    <li><CheckCircle2 size={13} className="text-teal" /> Answer common screening questions and submit.</li>
                    <li><CheckCircle2 size={13} className="text-teal" /> Log every completed application to your cloud database in real-time.</li>
                  </ul>
                  <div className="safety-callout">
                    <ShieldAlert size={16} />
                    <span><strong>Pro-Tip:</strong> You can switch to other desktop apps while Penguin runs in the background. Just don't close the LinkedIn, Naukri or Indeed tabs!</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="guide-steps">
              {/* Step 1 Windows */}
              <div className="guide-step-item">
                <div className="step-badge">1</div>
                <div className="step-details">
                  <h4>Launch Chrome with Remote Debugging (Port 9222)</h4>
                  <p>
                    Press <code>Win + R</code>, type <code>cmd</code>, and hit Enter to open <strong>Command Prompt</strong>. Paste and run:
                  </p>
                  <div className="code-box-wrapper">
                    <pre className="code-block"><code>{winCommand}</code></pre>
                    <button
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(winCommand, 'win')}
                      title="Copy to clipboard"
                    >
                      {copiedWin ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      <span>{copiedWin ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="sub-p" style={{ marginTop: 8 }}>
                    If Chrome is installed in 32-bit Program Files (x86), use:
                  </p>
                  <div className="code-box-wrapper">
                    <pre className="code-block"><code>{win32Command}</code></pre>
                    <button
                      className="btn-copy-code"
                      onClick={() => copyToClipboard(win32Command, 'win32')}
                      title="Copy to clipboard"
                    >
                      {copiedWin32 ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      <span>{copiedWin32 ? 'Copied!' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 2 Windows */}
              <div className="guide-step-item">
                <div className="step-badge">2</div>
                <div className="step-details">
                  <h4>Log In to LinkedIn</h4>
                  <p>
                    In the Chrome window that just opened, visit <a href="https://www.linkedin.com" target="_blank" rel="noreferrer">linkedin.com</a> and log in with your credentials.
                  </p>
                </div>
              </div>

              {/* Step 3 Windows */}
              <div className="guide-step-item">
                <div className="step-badge">3</div>
                <div className="step-details">
                  <h4>Verify CDP Connection in Penguin AI</h4>
                  <p>
                    Check the header status bar in Penguin AI. Look for the green <strong>CDP Connected</strong> badge.
                  </p>
                </div>
              </div>

              {/* Step 4 Windows */}
              <div className="guide-step-item">
                <div className="step-badge">4</div>
                <div className="step-details">
                  <h4>Configure Roles &amp; Upload Resume</h4>
                  <p>
                    Click <strong>Config</strong> to verify your phone number, experience, and upload your PDF resume.
                  </p>
                </div>
              </div>

              {/* Step 5 Windows */}
              <div className="guide-step-item">
                <div className="step-badge">5</div>
                <div className="step-details">
                  <h4>Click "Run Penguin"</h4>
                  <p>
                    Penguin will take over, auto-navigating through job posts, filling out multi-step Easy Apply dialogs, and tracking every application.
                  </p>
                  <div className="safety-callout">
                    <ShieldAlert size={16} />
                    <span><strong>Windows Tip:</strong> Keep the Chrome window running (you can minimize or place it in the background while you work).</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="how-to-footer">
          <button className="btn btn-primary" onClick={onClose}>
            <span>Got it, Let's Apply!</span>
          </button>
        </div>
      </div>
    </div>
  );
}
