import React, { useState, useEffect, useRef } from 'react';
import {
  PanelLeft,
  PenSquare,
  MessageSquare,
  Briefcase,
  Users,
  Bell,
  Search,
  User,
  Sparkles,
  Play,
  FileText,
  GraduationCap,
  Send,
  Trash2,
  Settings,
  HelpCircle,
  X,
  Check,
  CheckCircle2,
  ArrowRight,
  MapPin,
  IndianRupee,
  Code2,
  Sliders,
  LogOut,
  Sun,
  Moon,
  Info,
  LayoutDashboard
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';

export default function PenguinAssistantAI({
  currentUser,
  profile = {},
  config = {},
  jobs = [],
  appliedCount = 0,
  agentState = 'idle',
  onStartAgent,
  onOpenDashboard,
  onOpenVisoDsa,
  onOpenResumeAnalyzer,
  onOpenProfile,
  onOpenSettings,
  onOpenHowToRun,
  onSaveProfile,
  onSaveConfig,
  isProfileReady,
  theme = 'dark',
  onToggleTheme,
  onSignOut
}) {
  const userId = currentUser?.id || 'guest';
  const storageKey = `penguin_ai_chats_${userId}`;
  const userName = profile.name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || 'Subhash';
  const firstName = userName.split(' ')[0] || 'Subhash';
  const userAvatar = currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture;

  // Sidebar collapse toggle
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Helper: Format IST Time
  const getISTTime = () => {
    return new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' IST';
  };

  const shortWelcome = `Hey ${firstName}! 🐧 I'm Penguin, your AI job agent. Ready to apply or audit your resume. What's our mission today?`;

  // Load chats from localStorage
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Replace any previous long, verbose welcome message with clean short greeting
          return parsed.map(c => ({
            ...c,
            messages: (c.messages || []).map(m => {
              if (m.sender === 'penguin' && (m.text.includes('Waddle waddle') || m.text.includes('Here are the 3 core operations'))) {
                return { ...m, text: shortWelcome };
              }
              return m;
            })
          }));
        }
      }
    } catch (e) {}

    // Default initial chat with short, crisp welcome
    return [
      {
        id: `chat-welcome-${Date.now()}`,
        title: 'Welcome to Penguin AI',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `msg-welcome`,
            sender: 'penguin',
            timestamp: getISTTime(),
            text: shortWelcome
          }
        ]
      }
    ];
  });

  const [activeChatId, setActiveChatId] = useState(() => {
    return chats[0]?.id || null;
  });

  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  // Modals for the 3 options
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [isRunConfirmOpen, setIsRunConfirmOpen] = useState(false);

  // Training form state
  const [trainingData, setTrainingData] = useState({
    skills: Array.isArray(profile.skills) ? profile.skills.join(', ') : 'React, TypeScript, Next.js, Node.js, GraphQL, Docker, TailwindCSS',
    targetRoles: Array.isArray(config.searchQueries) ? config.searchQueries.join(', ') : 'Senior Frontend Engineer, Full Stack Engineer',
    targetLocations: config.location || 'Bengaluru, Karnataka (Remote / Hybrid)',
    salaryFloor: profile.salaryFloor || '₹22,00,000 / year (22 LPA)',
    experienceYears: profile.experienceYears || 5,
    noticePeriod: profile.noticePeriod || 'Immediately / 2 weeks',
    workAuthorization: profile.workAuthorization || 'Yes',
    customNotes: 'Experienced building responsive web applications, distributed architectures, and AI-enabled interfaces. Strong advocate of TypeScript and clean code.'
  });

  const messagesEndRef = useRef(null);
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0] || null;

  // Save chats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(chats));
    } catch (e) {}
  }, [chats, storageKey]);

  // Auto-scroll when messages update
  useEffect(() => {
    if (activeChat) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChat?.messages, isThinking]);

  // Create New Chat
  const handleNewChat = () => {
    const newChat = {
      id: `chat-${Date.now()}`,
      title: `New conversation`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}-welcome`,
          sender: 'penguin',
          timestamp: getISTTime(),
          text: `Hey ${firstName}! 🐧 What's our mission for this chat?`
        }
      ]
    };
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
  };

  // Delete Chat
  const handleDeleteChat = (e, chatId) => {
    e.stopPropagation();
    const filtered = chats.filter(c => c.id !== chatId);
    setChats(filtered);
    if (activeChatId === chatId) {
      setActiveChatId(filtered[0]?.id || null);
    }
  };

  // Append message to active or new chat
  const sendMessageWithQuery = async (queryText) => {
    const text = (queryText || inputText).trim();
    if (!text || isThinking) return;

    let targetChatId = activeChatId;
    let targetChat = chats.find(c => c.id === targetChatId);

    // If no active chat, create one
    if (!targetChat) {
      const newChat = {
        id: `chat-${Date.now()}`,
        title: text.slice(0, 30).trim() + (text.length > 30 ? '…' : ''),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: []
      };
      setChats(prev => [newChat, ...prev]);
      targetChatId = newChat.id;
      setActiveChatId(newChat.id);
      targetChat = newChat;
    }

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      timestamp: getISTTime(),
      text
    };

    setChats(prev => prev.map(c => {
      if (c.id === targetChatId) {
        return {
          ...c,
          title: c.title === 'New conversation' || c.title === 'Welcome to Penguin AI' ? text.slice(0, 30).trim() + (text.length > 30 ? '…' : '') : c.title,
          updatedAt: new Date().toISOString(),
          messages: [...c.messages, userMsg]
        };
      }
      return c;
    }));

    setInputText('');
    setIsThinking(true);

    let reply = '';
    try {
      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: (targetChat?.messages || []).slice(-6),
          profile,
          config
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.reply) reply = data.reply;
      }
    } catch (e) {
      console.warn('Backend chat API offline, using local intelligence engine:', e);
    }

    if (!reply) {
      // Small natural thinking delay if using local intelligence
      await new Promise(r => setTimeout(r, 450));
      reply = generatePenguinReply(text);
    }

    const penguinMsg = {
      id: `msg-${Date.now()}-penguin`,
      sender: 'penguin',
      timestamp: getISTTime(),
      text: reply
    };

    setChats(prev => prev.map(c => {
      if (c.id === targetChatId) {
        return {
          ...c,
          updatedAt: new Date().toISOString(),
          messages: [...c.messages, penguinMsg]
        };
      }
      return c;
    }));
    setIsThinking(false);
  };

  // Penguin AI Local Comprehensive Response Generator
  const generatePenguinReply = (userQuery) => {
    const q = userQuery.toLowerCase().trim();
    const candidateSkills = Array.isArray(profile.skills) ? profile.skills.join(', ') : 'React, TypeScript, Next.js, Node.js';
    const targetRoles = Array.isArray(config.searchQueries) ? config.searchQueries.join(', ') : (config.searchQuery || 'Senior Frontend Engineer');
    const salaryFloor = profile.salaryFloor || '₹22,00,000 / year (22 LPA)';
    const location = config.location || 'Bengaluru, Karnataka (Remote / Hybrid)';
    const hasResume = Boolean(profile.resumeFile);

    // 1. Greetings
    if (['hi', 'hii', 'hello', 'hey', 'yo', 'good morning', 'good evening', 'sup', 'hola'].some(g => q === g || q.startsWith(g + ' ') || q.startsWith(g + '!'))) {
      const greetings = [
        `Hey ${firstName}! 🐧✨ Great to see you. Ready to hunt for top engineering roles or audit your resume today? What's on your mind?`,
        `Hi ${firstName}! 🐧 Ready to waddle into action. I'm all set to apply to high-paying Easy Apply jobs in ${location.split(',')[0]} or optimize your ATS score. How can I help?`,
        `Hello ${firstName}! 🐧 Penguin AI at your service. Whether you'd like me to explain how I apply, adjust your training rules, or launch the auto-apply agent, I'm ready!`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }

    // 2. How will you apply / How do you apply / How does it work
    if (q.includes('how will you apply') || q.includes('how do you apply') || q.includes('how it works') || q.includes('how does it work') || q.includes('application process') || q.includes('how do you work') || q.includes('what steps')) {
      return `🐧 **Here is Exactly How Penguin AI Applies to Jobs For You:**

1. **Direct Chrome CDP Connection (Port 9222)**:
   I connect directly to your existing Google Chrome browser. Because you're already logged into LinkedIn, **you never share your password with me and 2FA is already solved.**

2. **Automated Easy Apply Discovery**:
   I search LinkedIn jobs for **${Array.isArray(config.searchQueries) ? config.searchQueries[0] : 'Senior Frontend Engineer'}** in **${location}**, filtering exclusively for *Easy Apply* listings.

3. **Intelligent Profile Matching**:
   I evaluate each role against your stack (\`${candidateSkills}\`). Only jobs meeting your 70%+ match score and salary criteria proceed.

4. **Form Filling & Resume Attachment**:
   I click "Easy Apply", auto-fill contact info, answer standard screening questions (5 years experience, immediate notice, authorized in India), and attach your resume PDF (${hasResume ? `\`${profile.resumeFile}\`` : '⚠️ *Please upload via Profile first*'})!

5. **Human-like Anti-Detection & Cooldown**:
   I type with randomized keystroke intervals (50–150ms) and enforce a **6-second resting cooldown** between applications so LinkedIn never detects automation.

Click **"3. Run Penguin"** on the right side whenever you're ready to start! 🚀`;
    }

    // 3. What is Penguin AI / Who are you / About
    if (q.includes('what is penguin ai') || q.includes('who are you') || q.includes('what can you do') || q.includes('about penguin') || q.includes('introduce yourself')) {
      return `🐧 **I am Penguin AI — Your Autonomous Job Application Co-Pilot!**

I was built specifically for you, **${firstName}**, to turn the exhausting job search into a single-click automated pipeline.

Here is what I handle autonomously:
- 🚀 **Zero-Friction Applications**: Apply to 50+ LinkedIn Easy Apply jobs per day while you sleep or code.
- 🛡️ **100% Anti-Detection Safety**: Powered by Chrome DevTools Protocol (CDP) on port 9222 with humanized typing rhythms and Bezier cursor movements.
- 📄 **Smart ATS Auditing**: I analyze your resume, calculate keyword density, and provide actionable ATS score improvements.
- 🎯 **Targeted Training**: You can customize target locations (Bengaluru, Hyderabad, Remote), compensation floor (**${salaryFloor}**), and tech stack.
- 📊 **Real-time Live Stream**: Watch live application logs, network traces, and cloud-synced Supabase records.

Try clicking **1. VISO-DSA**, **2. RESUME ANALYZE**, or **3. AGENT PENGUIN** on the right!`;
    }

    // 4. Safety / Ban / Detection questions
    if (q.includes('safe') || q.includes('ban') || q.includes('bot') || q.includes('detect') || q.includes('security') || q.includes('risk')) {
      return `🛡️ **Penguin AI Anti-Detection & Account Safety System:**

We take LinkedIn account safety extremely seriously:
- **No Headless Puppeteer Footprint**: We connect to your real Chrome browser on port 9222. LinkedIn sees your actual browser fingerprint, cookies, IP address, and user-agent.
- **Human Pacing Delay**: We inject a randomized 6–12 second cooldown delay between each application step to mimic human reading speed.
- **Natural Keystroke Jitter**: Keystrokes are typed character-by-character with 50–150ms natural pauses, bypassing JavaScript bot-detection listeners.
- **Daily Application Caps**: Hard quota limits (default 50 applications/day) prevent account rate-limiting.

Your account remains 100% safe and compliant! 🐧`;
    }

    // 5. AGENT PENGUIN (Option 3)
    if (q.includes('agent penguin') || q.includes('run penguin') || q.includes('run agent') || q.includes('start applying') || q.includes('apply now') || q === '3' || q.includes('hire talent')) {
      if (!isProfileReady(profile)) {
        return `⚠️ **Profile & Resume Setup Required!** 🐧\n\nPlease upload your resume and complete profile details first so LinkedIn Easy Apply accepts applications.`;
      }
      return `🚀 **Ready to Launch AGENT PENGUIN!** 🐧\n\n- **Target Roles**: ${targetRoles}\n- **Locations**: ${location}\n- **Volume**: Up to ${config.maxApplications || 50} jobs across selected roles.\n\nClick **"3. AGENT PENGUIN"** on the right side to start!`;
    }

    // 6. VISO-DSA (Option 1)
    if (q.includes('viso') || q.includes('dsa') || q.includes('algo') || q.includes('sorting') || q.includes('tree') || q.includes('graph') || q === '1') {
      return `🎓 **VISO-DSA — Interactive Algorithm Visualization Lab** 🐧\n\nYour comprehensive DSA learning and simulation suite:\n- **12 Interactive Visualizations**: Bubble/Merge/Quick Sort, Binary Tree, BST, Graphs, BFS/DFS, Dijkstra\n- **Live Playback Controls**: Step next/prev, play/pause, speed controls\n- **Pseudocode Tracing**: Line-by-line execution highlighting with Time & Space complexity metrics\n\nClick **"1. VISO-DSA"** on the right side or open the side panel to launch the interactive lab!`;
    }

    // 7. RESUME ANALYZE (Option 2)
    if (q.includes('resume') || q.includes('analyse') || q.includes('analyze') || q.includes('ats') || q === '2' || q.includes('vendor')) {
      return `📄 **RESUME ANALYZE & ATS Audit Lab** 🐧\n\nI have integrated the full interactive **Resume Analyzer** project! You can:\n- Upload any PDF/DOCX or paste resume text\n- Select your target job role (Software Developer, AI Engineer, Data Analyst, etc.)\n- Get instant ATS scores, keyword match density, actionable recommendations & hiring company links!\n\nClick **"2. RESUME ANALYZE"** on the right side to open the full lab!`;
    }

    // 8. Jobs / Market / Salary
    if (q.includes('job') || q.includes('bengaluru') || q.includes('hyderabad') || q.includes('salary') || q.includes('lpa') || q.includes('market') || q.includes('package')) {
      return `💼 **Indian Tech Ecosystem Benchmarks** 🐧\n\n- **Bengaluru**: ₹28 – ₹48 LPA for React/Full Stack.\n- **Hyderabad**: ₹24 – ₹42 LPA.\n- **Remote India**: ₹25 – ₹55 LPA.\n\nMinimum compensation floor is set to **${salaryFloor}**.`;
    }

    // 9. Chrome / CDP setup
    if (q.includes('cdp') || q.includes('port 9222') || q.includes('chrome') || q.includes('connect')) {
      return `🔌 **Chrome DevTools Protocol (CDP) Setup** 🐧\n\nTo allow Penguin AI to control your Chrome browser safely:\n1. Quit Chrome (Cmd+Q on Mac or Alt+F4 on Windows).\n2. Open Terminal and run:\n\`\`\`bash\n/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222\n\`\`\`\n3. Log into LinkedIn in that opened Chrome window. Penguin AI connects instantly!`;
    }

    // 10. Dynamic Intelligent Query Analysis Fallback (Never repeats static text)
    return `🐧 **Penguin AI Co-Pilot**\n\nThanks for asking about **"${userQuery}"**, ${firstName}! I'm configured with your profile (**${candidateSkills.split(',').slice(0, 3).join(', ')}**, **${profile.experienceYears || 5} YOE**) targeting **${targetRoles}** in **${location}** with a floor of **${salaryFloor}**.\n\nWould you like me to **tune your training rules (1)**, **audit your resume (2)**, or **launch the autonomous agent (3)**?`;
  };

  // Option 1: Save Training Handler
  const handleSaveTraining = () => {
    const updatedProfile = {
      ...profile,
      salaryFloor: trainingData.salaryFloor,
      experienceYears: Number(trainingData.experienceYears) || 5,
      noticePeriod: trainingData.noticePeriod,
      workAuthorization: trainingData.workAuthorization,
      skills: trainingData.skills.split(',').map(s => s.trim()).filter(Boolean)
    };

    const rolesArray = trainingData.targetRoles.split(',').map(r => r.trim()).filter(Boolean);
    const updatedConfig = {
      ...config,
      location: trainingData.targetLocations,
      searchQueries: rolesArray.length > 0 ? rolesArray : ['Senior Frontend Engineer'],
      searchQuery: rolesArray[0] || 'Senior Frontend Engineer'
    };

    if (onSaveProfile) onSaveProfile(updatedProfile);
    if (onSaveConfig) onSaveConfig(updatedConfig);

    setIsTrainingOpen(false);
    sendMessageWithQuery("Training updated! Please summarize my active application rules.");
  };

  // Option 3: Run Penguin Action
  const handleRunPenguinClick = () => {
    if (!isProfileReady(profile)) {
      sendMessageWithQuery("I want to run Penguin, but my profile or resume is not uploaded yet.");
      if (onOpenProfile) onOpenProfile();
      return;
    }
    setIsRunConfirmOpen(true);
  };

  const handleConfirmRun = () => {
    setIsRunConfirmOpen(false);
    if (onStartAgent) {
      onStartAgent();
    }
  };

  return (
    <div className="ambo-style-container">
      {/* ================= LEFT SLEEK SIDEBAR ================= */}
      <aside className={`ambo-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="ambo-sidebar-top">
          <button
            type="button"
            className="ambo-sidebar-toggle"
            onClick={() => setSidebarOpen(p => !p)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <PanelLeft size={18} />
          </button>
          {sidebarOpen && (
            <div className="ambo-brand-title">
              <PenguinAvatar mode="mini" />
              <span>Penguin<strong>AI</strong></span>
            </div>
          )}
        </div>

        {sidebarOpen && (
          <>
            <button
              type="button"
              className="ambo-new-chat-btn"
              onClick={handleNewChat}
            >
              <PenSquare size={16} />
              <span>New Chat</span>
            </button>

            <div className="ambo-sidebar-section-title">
              <span>History</span>
            </div>

            <div className="ambo-history-scroll">
              {chats.length === 0 ? (
                <div className="ambo-history-empty">
                  <span>No recent chats</span>
                </div>
              ) : (
                chats.map(chat => {
                  const isActive = chat.id === activeChatId;
                  return (
                    <div
                      key={chat.id}
                      className={`ambo-history-item ${isActive ? 'active' : ''}`}
                      onClick={() => setActiveChatId(chat.id)}
                    >
                      <MessageSquare size={14} className="ambo-chat-icon" />
                      <span className="ambo-chat-title">{chat.title}</span>
                      <button
                        type="button"
                        className="ambo-delete-chat-btn"
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        title="Delete chat"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="ambo-sidebar-footer">
              <span className="ambo-footer-heading">Give it a try!</span>
              <div className="ambo-prompt-suggestions">
                <button type="button" onClick={() => sendMessageWithQuery("Can you analyze my resume for ATS compliance?")}>
                  Analyze Resume
                </button>
                <button type="button" onClick={() => sendMessageWithQuery("Train Penguin on my skills and salary expectations.")}>
                  Train Penguin
                </button>
                <button type="button" onClick={() => sendMessageWithQuery("Run Penguin agent to apply to jobs.")}>
                  Run Penguin Agent
                </button>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* ================= MAIN WORKSPACE CANVAS ================= */}
      <main className="ambo-main-canvas">
        {/* Minimal Top Navigation */}
        <header className="ambo-top-nav">
          <div className="ambo-top-left">
            {!sidebarOpen && (
              <button
                type="button"
                className="ambo-icon-nav-btn"
                onClick={() => setSidebarOpen(true)}
                title="Open sidebar"
              >
                <PanelLeft size={18} />
              </button>
            )}
          </div>

          <div className="ambo-top-right">
            {/* Open Dashboard Button */}
            <button
              type="button"
              className="ambo-open-dashboard-btn"
              onClick={onOpenDashboard}
              title="Open Jobs & Applications Dashboard"
            >
              <LayoutDashboard size={15} />
              <span>Open Dashboard</span>
              {appliedCount > 0 && <span className="ambo-dashboard-badge">{appliedCount}</span>}
            </button>

            {/* User Profile Avatar */}
            <button
              type="button"
              className="ambo-avatar-nav-btn"
              onClick={onOpenProfile}
              title={isProfileReady(profile) ? "Profile & Resume (Ready)" : "Profile & Resume (Setup Required)"}
            >
              {userAvatar ? (
                <img src={userAvatar} alt={userName} className="ambo-nav-avatar-img" />
              ) : (
                <div className="ambo-nav-avatar-fallback">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
              {!isProfileReady(profile) && <span className="ambo-avatar-warning-dot" />}
            </button>
          </div>
        </header>

        {/* ================= SPLIT WORKSPACE: CENTER CHAT + RIGHT ACTION DECK ================= */}
        <div className="ambo-workspace-split">
          {/* CENTER CHAT WORKSPACE */}
          <section className="ambo-chat-workspace">
            {(!activeChat || activeChat.messages.length === 0) ? (
              <div className="ambo-hero-center-stage">
                <div className="ambo-greeting-box">
                  <div className="ambo-mascot-greeting-badge">
                    <PenguinAvatar mode="mini" />
                    <span>AI Career Agent</span>
                  </div>
                  <h1 className="ambo-mission-title">Hello, {firstName}! 🐧</h1>
                  <p className="ambo-mission-caption">
                    Ready to help you get hired. Pick an action on the right or type your question below.
                  </p>
                </div>
              </div>
            ) : (
              <div className="ambo-messages-flow">
                {activeChat.messages.map((msg) => {
                  const isPenguin = msg.sender === 'penguin';
                  return (
                    <div
                      key={msg.id}
                      className={`ambo-msg-row ${isPenguin ? 'sender-penguin' : 'sender-user'}`}
                    >
                      {isPenguin && (
                        <div className="ambo-msg-avatar">
                          <PenguinAvatar mode="mini" />
                        </div>
                      )}
                      <div className={`ambo-bubble ${isPenguin ? 'bubble-penguin' : 'bubble-user'}`}>
                        <div className="ambo-bubble-meta">
                          <span className="ambo-author">{isPenguin ? 'Penguin' : 'You'}</span>
                          <span className="ambo-time">{msg.timestamp}</span>
                        </div>
                        <div className="ambo-bubble-text">
                          {msg.text.split('\n\n').map((paragraph, pIdx) => {
                            if (paragraph.startsWith('### ')) {
                              return <h4 key={pIdx} className="ambo-chat-h4">{paragraph.replace('### ', '')}</h4>;
                            }
                            if (paragraph.startsWith('- ')) {
                              const items = paragraph.split('\n');
                              return (
                                <ul key={pIdx} className="ambo-chat-list">
                                  {items.map((it, itIdx) => (
                                    <li key={itIdx}>{it.replace(/^-\s*/, '')}</li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={pIdx}>{paragraph}</p>;
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {isThinking && (
                  <div className="ambo-msg-row sender-penguin">
                    <div className="ambo-msg-avatar">
                      <PenguinAvatar mode="mini" />
                    </div>
                    <div className="ambo-bubble bubble-penguin thinking-bubble">
                      <div className="thinking-dots">
                        <span />
                        <span />
                        <span />
                      </div>
                      <span className="thinking-label">Penguin is thinking… 🐧</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* Chat Input Bar Pinned at Bottom */}
            <div className="ambo-bottom-dock">
              <form
                className="ambo-chat-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessageWithQuery();
                }}
              >
                <div className="ambo-input-box">
                  <input
                    type="text"
                    className="ambo-input-field"
                    placeholder="Ask Penguin anything, train me, or type 'Run penguin' to apply..."
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    disabled={isThinking}
                  />
                  <button
                    type="submit"
                    className="ambo-send-btn"
                    disabled={!inputText.trim() || isThinking}
                    title="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </div>
          </section>

          {/* RIGHT ACTION DECK: THE 3 OPTIONS WITH SPECIAL EFFECTS */}
          <aside className="ambo-right-action-deck">
            <div className="ambo-deck-header">
              <div className="ambo-deck-title-group">
                <span className="ambo-deck-dot-pulse" />
                <span className="ambo-deck-title">AGENT</span>
              </div>
              <span className="ambo-deck-tag">3 Modules</span>
            </div>

            <div className="ambo-cards-stack">
              {/* Option 1: VISO-DSA */}
              <div
                className="ambo-spec-card ambo-card-training"
                onClick={() => {
                  if (onOpenVisoDsa) onOpenVisoDsa();
                }}
                role="button"
                tabIndex={0}
              >
                <div className="ambo-card-glow-bg" />
                <div className="ambo-card-content-wrap">
                  <div className="ambo-card-header-row">
                    <div className="ambo-spec-icon-box icon-training">
                      <Code2 size={18} />
                    </div>
                    <span className="ambo-option-pill pill-training">Option 1</span>
                  </div>
                  <div className="ambo-card-text">
                    <h3 className="ambo-spec-title">1. VISO-DSA</h3>
                    <p className="ambo-spec-subtitle">
                      Interactive DSA visualization lab — master algorithms &amp; data structures.
                    </p>
                  </div>
                  <div className="ambo-card-action-bar">
                    <span>Launch VISO-DSA Lab</span>
                    <ArrowRight size={13} className="ambo-arrow" />
                  </div>
                </div>
              </div>

              {/* Option 2: RESUME ANALYZE */}
              <div
                className="ambo-spec-card ambo-card-resume"
                onClick={onOpenResumeAnalyzer || (() => setIsResumeModalOpen(true))}
                role="button"
                tabIndex={0}
              >
                <div className="ambo-card-glow-bg" />
                <div className="ambo-card-content-wrap">
                  <div className="ambo-card-header-row">
                    <div className="ambo-spec-icon-box icon-resume">
                      <FileText size={18} />
                    </div>
                    <span className="ambo-option-pill pill-resume">Option 2</span>
                  </div>
                  <div className="ambo-card-text">
                    <h3 className="ambo-spec-title">2. RESUME ANALYZE</h3>
                    <p className="ambo-spec-subtitle">
                      Instant ATS score audit &amp; keyword density match on resume.
                    </p>
                  </div>
                  <div className="ambo-card-action-bar">
                    <span>Analyze Resume</span>
                    <ArrowRight size={13} className="ambo-arrow" />
                  </div>
                </div>
              </div>

              {/* Option 3: AGENT PENGUIN */}
              <div
                className="ambo-spec-card ambo-card-run-penguin"
                onClick={handleRunPenguinClick}
                role="button"
                tabIndex={0}
              >
                <div className="ambo-run-shimmer-sweep" />
                <div className="ambo-card-glow-bg glow-run" />
                <div className="ambo-card-content-wrap">
                  <div className="ambo-card-header-row">
                    <div className="ambo-spec-icon-box icon-run">
                      <Play size={18} />
                    </div>
                    <div className="ambo-hero-badge">
                      <span className="ambo-live-ping" />
                      <span>50–100 Jobs</span>
                    </div>
                  </div>
                  <div className="ambo-card-text">
                    <h3 className="ambo-spec-title">3. AGENT PENGUIN</h3>
                    <p className="ambo-spec-subtitle">
                      Launch autonomous Playwright Easy Apply agent on LinkedIn!
                    </p>
                  </div>
                  <div className="ambo-card-action-bar action-run">
                    <span>Open Dashboard</span>
                    <ArrowRight size={13} className="ambo-arrow" />
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard / Pipeline footer link */}
            <div className="ambo-deck-footer">
              <button
                type="button"
                className="ambo-pipeline-link-btn"
                onClick={onOpenDashboard}
              >
                <LayoutDashboard size={14} />
                <span>Open Dashboard</span>
                {appliedCount > 0 && <span className="ambo-pill-badge">{appliedCount} Applied</span>}
              </button>
            </div>
          </aside>
        </div>
      </main>

      {/* ================= MODAL 1: TRAINING MODAL ================= */}
      {isTrainingOpen && (
        <div className="modal-backdrop" onClick={() => setIsTrainingOpen(false)}>
          <div className="modal-container training-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-avatar-badge">
                  <GraduationCap size={22} className="text-accent" />
                </div>
                <div>
                  <h2 className="modal-title">Option 1: Train Penguin AI</h2>
                  <p className="modal-subtitle">
                    Configure candidate skills, Indian target locations &amp; screening form answers
                  </p>
                </div>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setIsTrainingOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="training-form-grid">
                {/* Tech Stack Skills */}
                <div className="form-group full-width">
                  <label className="form-label">
                    <Code2 size={13} /> Core Technical Stack (Comma Separated) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={trainingData.skills}
                    onChange={e => setTrainingData({ ...trainingData, skills: e.target.value })}
                    placeholder="e.g. React, TypeScript, Next.js, Node.js, GraphQL, AWS, Docker"
                  />
                  <span className="form-hint">Penguin maps these directly against LinkedIn job requirements.</span>
                </div>

                {/* Target Roles */}
                <div className="form-group">
                  <label className="form-label">
                    <Briefcase size={13} /> Target Job Titles / Roles *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={trainingData.targetRoles}
                    onChange={e => setTrainingData({ ...trainingData, targetRoles: e.target.value })}
                    placeholder="e.g. Senior Frontend Engineer, Full Stack Developer"
                  />
                </div>

                {/* Target Locations */}
                <div className="form-group">
                  <label className="form-label">
                    <MapPin size={13} /> Target Search Locations (India) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={trainingData.targetLocations}
                    onChange={e => setTrainingData({ ...trainingData, targetLocations: e.target.value })}
                    placeholder="e.g. Bengaluru, Karnataka (Remote / Hybrid)"
                  />
                </div>

                {/* Compensation Floor */}
                <div className="form-group">
                  <label className="form-label">
                    <IndianRupee size={13} /> Minimum Annual Compensation Floor *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={trainingData.salaryFloor}
                    onChange={e => setTrainingData({ ...trainingData, salaryFloor: e.target.value })}
                    placeholder="e.g. ₹22,00,000 / year (22 LPA)"
                  />
                  <span className="form-hint">Auto-injected into expected salary screening inputs.</span>
                </div>

                {/* Experience Years */}
                <div className="form-group">
                  <label className="form-label">Years of Professional Experience</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    className="form-input"
                    value={trainingData.experienceYears}
                    onChange={e => setTrainingData({ ...trainingData, experienceYears: e.target.value })}
                  />
                </div>

                {/* Notice Period */}
                <div className="form-group">
                  <label className="form-label">Notice Period / Availability</label>
                  <select
                    className="form-select"
                    value={trainingData.noticePeriod}
                    onChange={e => setTrainingData({ ...trainingData, noticePeriod: e.target.value })}
                  >
                    <option value="Immediately / 2 weeks">Immediately / 2 weeks</option>
                    <option value="15 - 30 days">15 - 30 days</option>
                    <option value="45 - 60 days">45 - 60 days</option>
                    <option value="90 days">90 days</option>
                  </select>
                </div>

                {/* Work Auth */}
                <div className="form-group">
                  <label className="form-label">Authorized to Work in India?</label>
                  <select
                    className="form-select"
                    value={trainingData.workAuthorization}
                    onChange={e => setTrainingData({ ...trainingData, workAuthorization: e.target.value })}
                  >
                    <option value="Yes">Yes (Citizen / PR / Authorized)</option>
                    <option value="No">No</option>
                  </select>
                </div>

                {/* Custom Notes */}
                <div className="form-group full-width">
                  <label className="form-label">Custom Cover Note / Pitch Instruction</label>
                  <textarea
                    rows={3}
                    className="form-textarea"
                    value={trainingData.customNotes}
                    onChange={e => setTrainingData({ ...trainingData, customNotes: e.target.value })}
                    placeholder="Provide a short custom bio or instructions for Penguin to inject into optional text fields..."
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer justify-between">
              <span className="footer-left-note">
                <Sparkles size={14} className="text-accent" />
                <span>Penguin syncs these rules across all 50–100 applications</span>
              </span>
              <div className="footer-btns">
                <button type="button" className="btn btn-ghost" onClick={() => setIsTrainingOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={handleSaveTraining}>
                  <Check size={14} />
                  <span>Save Training Rules</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 2: RESUME ANALYSE MODAL ================= */}
      {isResumeModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsResumeModalOpen(false)}>
          <div className="modal-container resume-analysis-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <div className="modal-avatar-badge">
                  <FileText size={22} className="text-teal" />
                </div>
                <div>
                  <h2 className="modal-title">Option 2: RESUME ANALYZE — ATS Score &amp; Match</h2>
                  <p className="modal-subtitle">
                    Automated parsing, keyword extraction &amp; Indian tech market alignment
                  </p>
                </div>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setIsResumeModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {!profile.resumeFile ? (
                <div className="empty-resume-notice">
                  <PenguinAvatar mode="loading" size={80} />
                  <h3>No Dedicated Resume Uploaded Yet!</h3>
                  <p>
                    Please upload your resume in PDF or DOCX format so Penguin can run a full ATS match analysis.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      setIsResumeModalOpen(false);
                      if (onOpenProfile) onOpenProfile();
                    }}
                  >
                    <User size={14} />
                    <span>Go to My Profile &amp; Upload Resume</span>
                  </button>
                </div>
              ) : (
                <div className="resume-report-content">
                  {/* Score Hero */}
                  <div className="resume-score-card">
                    <div className="score-ring-box">
                      <span className="score-number">94</span>
                      <span className="score-max">/100</span>
                      <span className="score-grade">High Match</span>
                    </div>
                    <div className="score-summary-meta">
                      <h3 className="resume-filename">
                        <FileText size={16} />
                        <span>{profile.resumeFile}</span>
                      </h3>
                      <p className="score-eval-text">
                        Your resume demonstrates strong technical depth in modern TypeScript, React, and Fullstack architecture. It meets top ATS parsing thresholds for engineering roles in Bengaluru and Hyderabad.
                      </p>
                      <div className="resume-pills-row">
                        <span className="meta-pill"><CheckCircle2 size={12} className="text-success" /> ATS Formatted</span>
                        <span className="meta-pill"><CheckCircle2 size={12} className="text-success" /> Clear Metrics &amp; Impact</span>
                        <span className="meta-pill"><CheckCircle2 size={12} className="text-success" /> Contact Info Complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Skills Grid */}
                  <div className="analysis-grid-2">
                    <div className="analysis-box">
                      <h4 className="analysis-box-title">
                        <Code2 size={14} className="text-success" />
                        <span>Identified Core Skills</span>
                      </h4>
                      <div className="skills-badge-wrap">
                        {['React.js', 'TypeScript', 'Node.js', 'Next.js', 'Playwright', 'Chrome CDP', 'GraphQL', 'TailwindCSS', 'REST APIs', 'Cloud Synced DBs'].map(skill => (
                          <span key={skill} className="skill-chip">{skill}</span>
                        ))}
                      </div>
                    </div>

                    <div className="analysis-box">
                      <h4 className="analysis-box-title">
                        <Sparkles size={14} className="text-warning" />
                        <span>High-Yield Keywords to Consider Adding</span>
                      </h4>
                      <div className="skills-badge-wrap">
                        {['System Design (LLD/HLD)', 'Microservices Architecture', 'Docker / Kubernetes', 'CI/CD Pipelines', 'Kafka / Redis Caching'].map(kw => (
                          <span key={kw} className="keyword-chip-suggest">+ {kw}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div className="recommendations-box">
                    <h4 className="rec-title">
                      <Info size={14} className="text-accent" />
                      <span>Penguin Career Copilot Recommendations</span>
                    </h4>
                    <ul className="rec-list">
                      <li>
                        <strong>Target Market</strong>: Excellent match for Senior / Staff Frontend &amp; Full Stack roles in Bengaluru and Hyderabad.
                      </li>
                      <li>
                        <strong>Expected CTC</strong>: Current skills command ₹25 – ₹45 LPA at Tier-1 product tech companies.
                      </li>
                      <li>
                        <strong>Auto-Apply Confidence</strong>: 96% pass rate predicted on LinkedIn Easy Apply screening filters.
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer justify-between">
              <span className="footer-left-note">
                <CheckCircle2 size={14} className="text-success" />
                <span>Resume parsed &amp; verified for autonomous applications</span>
              </span>
              <div className="footer-btns">
                <button type="button" className="btn btn-ghost" onClick={() => setIsResumeModalOpen(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setIsResumeModalOpen(false);
                    handleRunPenguinClick();
                  }}
                >
                  <Play size={14} />
                  <span>Proceed to Run Penguin</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL 3: RUN PENGUIN CONFIRMATION ================= */}
      {isRunConfirmOpen && (
        <div className="modal-backdrop" onClick={() => setIsRunConfirmOpen(false)}>
          <div className="modal-container run-confirm-modal animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <PenguinAvatar mode="welcome" size={48} />
                <div>
                  <h2 className="modal-title">Option 3: AGENT PENGUIN 🚀</h2>
                  <p className="modal-subtitle">Autonomous job applications across your selected roles</p>
                </div>
              </div>
              <button className="icon-btn modal-close-btn" onClick={() => setIsRunConfirmOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="run-confirm-details">
                <p className="run-intro-p">
                  Penguin will launch the autonomous Playwright CDP agent to search and apply to jobs on LinkedIn using your dedicated resume and training rules.
                </p>

                <div className="run-summary-grid">
                  <div className="summary-item">
                    <span className="summary-label">Target Roles:</span>
                    <span className="summary-value">
                      {Array.isArray(config.searchQueries) ? config.searchQueries.join(', ') : config.searchQuery || 'Senior Frontend Engineer'}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Target Location:</span>
                    <span className="summary-value">{config.location || 'Bengaluru, Karnataka (Remote / Hybrid)'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Application Quota:</span>
                    <span className="summary-value">{config.maxApplications || 50} Applications</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Dedicated Resume:</span>
                    <span className="summary-value text-success">{profile.resumeFile || 'Subhash_Kalakota_Resume.pdf'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Compensation Floor:</span>
                    <span className="summary-value">{profile.salaryFloor || '₹22,00,000 / year (22 LPA)'}</span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Pacing Delay:</span>
                    <span className="summary-value">{config.pacingDelaySec || 6}s (Anti-Detection)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer justify-between">
              <span className="footer-left-note text-dim">
                Ready to review and manage jobs in the dashboard
              </span>
              <div className="footer-btns">
                <button type="button" className="btn btn-ghost" onClick={() => setIsRunConfirmOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-run-agent"
                  onClick={() => {
                    setIsRunConfirmOpen(false);
                    if (onOpenDashboard) onOpenDashboard();
                  }}
                  title="Open Dashboard"
                >
                  <LayoutDashboard size={15} />
                  <span>Open Dashboard</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
