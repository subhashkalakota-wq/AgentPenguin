import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import { DASHBOARD_TABS } from './data/dashboardTabs';
import OverviewTab from './components/OverviewTab';
import PlatformPickerModal from './components/PlatformPickerModal';
import PlatformsBanner from './components/PlatformsBanner';
import MarketInsights from './components/MarketInsights';
import { searchLocations } from '../shared/locations';
import PenguinWelcome from './components/PenguinWelcome';
import CdpReminder from './components/CdpReminder';
import RunningPenguinOverlay, { RunningPenguinPill } from './components/RunningPenguinOverlay';
import LiveBrowserViewport from './components/LiveBrowserViewport';
import LiveExecutionTrace from './components/LiveExecutionTrace';
import JobsTable from './components/JobsTable';
import JobDetailModal from './components/JobDetailModal';
import AgentControlPanel from './components/AgentControlPanel';
import LoginPage from './components/LoginPage';
import ApplicationDetailPage from './components/ApplicationDetailPage';
import ProfileTab from './components/ProfileTab';
import CdpTab from './components/CdpTab';
import ProfileSetupModal from './components/ProfileSetupModal';
import PenguinAvatar from './components/PenguinAvatar';
import PenguinRunningPage from './components/PenguinRunningPage';
import PenguinAssistantAI from './components/PenguinAssistantAI';
import HowToRunModal from './components/HowToRunModal';
import VisoDsaPage from './components/VisoDsaPage';
import ResumeAnalyzerPage from './components/ResumeAnalyzerPage';
import { candidateProfile as defaultProfile } from './data/mockData';
import {
  supabase,
  syncAppliedJobToSupabase,
  fetchUserAppliedJobsFromSupabase,
  subscribeToAppliedJobs,
  syncProfileToSupabase,
  fetchUserProfileFromSupabase
} from './lib/supabase';
import { authFetch } from './lib/api';
import { missingScreeningAnswers } from '../shared/screeningQuestions';
import './App.css';
import './dashboard.css';
import './penguin-world.css';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [theme, setTheme] = useState('light');
  // Jobs — start EMPTY; populate from Supabase on login
  const [jobs, setJobs] = useState([]);
  const [logs, setLogs] = useState([]);
  const [agentState, setAgentState] = useState('idle');
  const [activeJob, setActiveJob] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [pacingCountdown, setPacingCountdown] = useState(0);
  const [selectedDetailJob, setSelectedDetailJob] = useState(null);
  const [detailPageJob, setDetailPageJob] = useState(null); // for dedicated job detail page
  const [showProfileSetupPrompt, setShowProfileSetupPrompt] = useState(false);
  const [hasPromptedProfileSetup, setHasPromptedProfileSetup] = useState(false);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(false);

  // URL routing: each path maps to a view + dashboard tab (overlays keep the current view)
  const resolveRoute = (path) => {
    const p = (path || '/').toLowerCase().replace(/\/+$/, '') || '/';
    switch (p) {
      case '/dashboard':
      case '/applications':    return { view: 'dashboard', tab: 'applications' };
      case '/overview':        return { view: 'dashboard', tab: 'overview' };
      case '/agent':
      case '/live':            return { view: 'dashboard', tab: 'live' };
      case '/activity':        return { view: 'dashboard', tab: 'activity' };
      case '/profile':         return { view: 'dashboard', tab: 'profile' };
      case '/cdp':             return { view: 'dashboard', tab: 'cdp' };
      case '/viso-dsa':        return { view: 'viso-dsa' };
      case '/resume-analyzer': return { view: 'resume-analyzer' };
      case '/config':
      case '/settings':        return { overlay: 'config' };
      case '/how-to-run':      return { overlay: 'how-to-run' };
      default:                 return { view: 'assistant' };
    }
  };

  const initialRoute = typeof window === 'undefined' ? { view: 'assistant' } : resolveRoute(window.location.pathname);

  const [currentView, setCurrentView] = useState(initialRoute.view || 'assistant');
  const [dashTab, setDashTab] = useState(initialRoute.tab || 'applications');
  const [isConfigOpen, setIsConfigOpen] = useState(initialRoute.overlay === 'config');
  const [isHowToRunOpen, setIsHowToRunOpen] = useState(initialRoute.overlay === 'how-to-run');
  const [showWelcomePenguin, setShowWelcomePenguin] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  // Penguin AI greets first ("Hi" + Enter Penguin World) once per browser session
  const [enteredPenguinWorld, setEnteredPenguinWorld] = useState(() => {
    try { return sessionStorage.getItem('pg_entered_world') === '1'; } catch { return false; }
  });
  const [worldJustEntered, setWorldJustEntered] = useState(false);
  const [loginNotice, setLoginNotice] = useState('');
  const [showPlatformPicker, setShowPlatformPicker] = useState(false);
  const [runProgress, setRunProgress] = useState(null);
  const [runWindow, setRunWindow] = useState('hidden'); // 'hidden' | 'open' | 'minimized'


  const isProfilePageOpen = currentView === 'dashboard' && dashTab === 'profile';

  const [cdpStatus, setCdpStatus] = useState({
    connected: false,
    port: 9222,
    tabTitle: 'Not Connected'
  });

  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('job_agent_config');
      if (saved) return JSON.parse(saved);
    } catch (e) { }
    return {
      searchQueries: ['Senior Frontend Engineer', 'Full Stack Engineer (React/Node)'],
      searchQuery: 'Senior Frontend Engineer',
      location: 'Bengaluru, Karnataka (Remote / Hybrid)',
      experienceLevel: 'Mid-Senior level',
      maxApplications: 50,
      pacingDelaySec: 6,
      minMatchScore: 70,
      cdpEndpoint: 'http://localhost:9222'
    };
  });

  // Profile completeness helper: strictly requires user-uploaded resume and core contact info
  const isProfileReady = useCallback((prof) => {
    if (!prof) return false;
    const hasResume = Boolean(prof.resumeFile && prof.resumePath);
    const hasName = Boolean(prof.name && prof.name.trim().length >= 2);
    const hasEmail = Boolean(prof.email && prof.email.includes('@'));
    const hasPhone = Boolean(prof.phone && prof.phone.trim().length >= 5);
    const hasAnswers = missingScreeningAnswers(prof.screeningAnswers).length === 0;
    return Boolean(hasResume && hasName && hasEmail && hasPhone && hasAnswers);
  }, []);

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem('job_agent_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Scrub accidental mock default resume
        if (parsed.resumeFile === 'Subhash_Kalakota_Resume.pdf' && !parsed.resumeSize) {
          parsed.resumeFile = null;
          parsed.resumePath = null;
        }
        return parsed;
      }
    } catch (e) { }
    return {
      ...defaultProfile,
      resumeFile: null,
      resumePath: null,
      resumeSize: null
    };
  });

  const handleSaveConfig = (newConfig) => {
    setConfig(newConfig);
    try { localStorage.setItem('job_agent_config', JSON.stringify(newConfig)); } catch (e) { }
  };

  const handleSaveProfile = async (newProfile) => {
    setProfile(newProfile);
    try {
      localStorage.setItem('job_agent_profile', JSON.stringify(newProfile));
      if (currentUser?.id) {
        localStorage.setItem(`job_agent_profile_${currentUser.id}`, JSON.stringify(newProfile));
      }
    } catch (e) { }

    // Sync to Supabase
    if (currentUser) {
      await syncProfileToSupabase(currentUser, newProfile);
    }

    // Sync to Express backend
    fetch('http://localhost:3001/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, profile: newProfile })
    }).catch(() => { });
  };

  const applyRoute = useCallback((path) => {
    const route = resolveRoute(path);
    if (route.overlay === 'config') { setIsConfigOpen(true); return; }
    if (route.overlay === 'how-to-run') { setIsHowToRunOpen(true); return; }
    setCurrentView(route.view);
    if (route.tab) setDashTab(route.tab);
    setIsConfigOpen(false);
    setIsHowToRunOpen(false);
    setDetailPageJob(null);
  }, []);

  // Central Navigation & URL Synchronization (supports browser Back/Forward, direct URLs, bookmarks)
  const navigateTo = useCallback((path, replace = false) => {
    if (typeof window === 'undefined') return;
    const cleanPath = path.toLowerCase();
    if (replace) {
      window.history.replaceState({ path: cleanPath }, '', cleanPath);
    } else if (window.location.pathname.toLowerCase() !== cleanPath) {
      window.history.pushState({ path: cleanPath }, '', cleanPath);
    }
    applyRoute(cleanPath);
  }, [applyRoute]);

  const openTab = useCallback((tab) => {
    const target = DASHBOARD_TABS.find(t => t.key === tab);
    navigateTo(target ? target.path : '/applications');
  }, [navigateTo]);

  // Listen for browser Back & Forward button navigation
  useEffect(() => {
    const handlePopState = () => applyRoute(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [applyRoute]);

  // ----- Auth -----
  const prevUserRef = useRef(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setCurrentUser(session.user);
      }
      setAuthChecking(false);
    }).catch(() => setAuthChecking(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      prevUserRef.current = session?.user || null;
      setCurrentUser(session?.user || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ----- Load real Supabase data when user logs in -----
  const loadJobsFromSupabase = useCallback(async (user) => {
    if (!user) return;
    setIsLoadingFromDB(true);
    try {
      const dbJobs = await fetchUserAppliedJobsFromSupabase(user);
      if (dbJobs && dbJobs.length > 0) {
        setJobs(dbJobs);
        addLog('cdp', 'SUPABASE SYNC', `Loaded ${dbJobs.length} real application records from Supabase for ${user.email}.`);
      } else {
        addLog('cdp', 'SUPABASE SYNC', 'No applications found in Supabase yet. Start the agent to apply to jobs!');
      }
    } catch (e) {
      addLog('warn', 'SUPABASE ERROR', `Could not load from Supabase: ${e.message}`);
    } finally {
      setIsLoadingFromDB(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Load profile from Supabase & localStorage
    const initUserProfile = async () => {
      let remote = null;
      try {
        remote = await fetchUserProfileFromSupabase(currentUser);
      } catch (e) { }

      let local = null;
      try {
        const item = localStorage.getItem(`job_agent_profile_${currentUser.id}`) || localStorage.getItem('job_agent_profile');
        if (item) local = JSON.parse(item);
      } catch (e) { }

      const authName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || '';
      const authEmail = currentUser.email || '';
      const authAvatar = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || null;

      setProfile(prev => {
        const merged = {
          ...prev,
          name: authName || prev.name,
          email: authEmail || prev.email,
          avatar: authAvatar || prev.avatar,
          ...(local || {}),
          ...(remote || {})
        };
        // Scrub accidental mock default resume
        if (merged.resumeFile === 'Subhash_Kalakota_Resume.pdf' && !merged.resumeSize) {
          merged.resumeFile = null;
          merged.resumePath = null;
        }

        // Check if incomplete and prompt user after signup/login
        if (!isProfileReady(merged)) {
          setShowWelcomePenguin(false);
          if (!hasPromptedProfileSetup) {
            setShowProfileSetupPrompt(true);
            setHasPromptedProfileSetup(true);
          }
        } else {
          setShowProfileSetupPrompt(false);
        }
        return merged;
      });
    };

    initUserProfile();

    // Load existing applications
    loadJobsFromSupabase(currentUser);

    // Real-time subscription
    const channel = subscribeToAppliedJobs(
      currentUser.id,
      (newRow) => {
        // Map DB row to UI shape
        const mapped = {
          id: newRow.job_id || newRow.id,
          title: newRow.title,
          company: newRow.company,
          location: newRow.location,
          salary: newRow.salary,
          matchScore: newRow.match_score,
          match_score: newRow.match_score,
          status: newRow.status || 'applied',
          appliedAt: newRow.applied_at,
          applied_at: newRow.applied_at,
          pacingDelaySec: newRow.pacing_delay_sec,
          llmReasoning: newRow.llm_reasoning ? { summary: newRow.llm_reasoning, decision: newRow.match_score >= 75 ? 'APPLY' : 'SKIP' } : null,
          llm_reasoning: newRow.llm_reasoning,
          stepsCompleted: newRow.steps_completed,
          stepsTotal: newRow.steps_total,
          url: newRow.url,
          logo: newRow.logo,
          easyApply: newRow.easy_apply,
          _fromDB: true,
        };
        setJobs(prev => {
          const exists = prev.find(j => j.id === mapped.id);
          if (exists) return prev.map(j => j.id === mapped.id ? { ...j, ...mapped } : j);
          return [mapped, ...prev];
        });
        addLog('success', 'REALTIME', `New application synced from Supabase: ${newRow.company}`);
      },
      (updatedRow) => {
        setJobs(prev => prev.map(j =>
          j.id === (updatedRow.job_id || updatedRow.id)
            ? { ...j, status: updatedRow.status, appliedAt: updatedRow.applied_at }
            : j
        ));
      }
    );

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [currentUser, loadJobsFromSupabase]);

  // Ask the backend (which verifies the Supabase token) whether this user has been
  // blocked. Blocked users are signed out. (Admins use the separate /admin console.)
  useEffect(() => {
    if (!currentUser) return undefined;
    let alive = true;
    const check = async () => {
      try {
        const res = await authFetch('/api/me');
        const me = await res.json();
        if (!alive) return;
        if (me.blocked) {
          setLoginNotice('Your account has been blocked by an administrator. Contact support if you think this is a mistake.');
          await supabase.auth.signOut().catch(() => {});
          setCurrentUser(null);
        }
      } catch { /* backend offline: keep current state */ }
    };
    check();
    const t = setInterval(check, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [currentUser]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Dashboard pages are branded "Agent Penguin" (black/white); the assistant stays "Penguin AI"
  useEffect(() => {
    const isAgent = currentView === 'dashboard';
    if (isAgent) document.documentElement.setAttribute('data-brand', 'agent');
    else document.documentElement.removeAttribute('data-brand');
    document.title = isAgent ? 'Agent Penguin — LinkedIn Easy Apply Agent' : 'Penguin AI — Baby Penguin LinkedIn Job Automation Agent';
  }, [currentView]);

  // Connect to Backend SSE Stream
  useEffect(() => {
    let eventSource;
    try {
      eventSource = new EventSource('http://localhost:3001/api/stream');

      eventSource.onmessage = (event) => {
        try {
          const { type, payload } = JSON.parse(event.data);
          if (type === 'init') {
            if (payload.cdpConnection) {
              setCdpStatus({
                connected: payload.cdpConnection.connected,
                port: payload.cdpConnection.port || 9222,
                tabTitle: payload.cdpConnection.tabTitle || 'Disconnected'
              });
            }
          } else if (type === 'log') {
            setLogs(prev => [...prev, payload]);
            if (payload.tag?.includes('NAVIGATE') || payload.tag?.includes('STEP 1') || payload.tag?.includes('MODAL OPEN')) {
              setCurrentStep(1);
            } else if (payload.tag?.includes('STEP 2')) {
              setCurrentStep(2);
            } else if (payload.tag?.includes('STEP 3') || payload.tag?.includes('SCREENING')) {
              setCurrentStep(3);
            } else if (payload.tag?.includes('SUBMIT') || payload.tag?.includes('STEP 4')) {
              setCurrentStep(4);
            }
            if (payload.tag === 'TAB CLOSED') {
              setAgentState('idle');
            }
          } else if (type === 'agentState') {
            setAgentState(payload);
          } else if (type === 'cdpStatus') {
            setCdpStatus(payload);
          } else if (type === 'jobs') {
            // Merge real jobs from server with DB jobs (server-scraped takes precedence)
            setJobs(prev => {
              const newIds = new Set(payload.map(j => j.id));
              const filtered = prev.filter(j => !newIds.has(j.id));
              return [...payload, ...filtered];
            });
          } else if (type === 'runProgress') {
            setRunProgress(payload);
          } else if (type === 'activeJob') {
            setActiveJob(payload);
            setCurrentStep(1);
          }
        } catch (_e) {
          // Non-JSON message
        }
      };

      eventSource.onerror = () => {
        // EventSource will auto-reconnect when server is available
      };
    } catch (err) {
      // Standalone mode — no backend server running
    }

    return () => { if (eventSource) eventSource.close(); };
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  // Add Log Helper
  const addLog = (type, tag, message) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }) + ' IST';
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: timeStr,
      type,
      tag,
      message
    };
    setLogs(prev => [...prev, newLog]);
  };

  // Derived counts
  const appliedCount = jobs.filter(j => j.status === 'applied').length;
  const shortlistedCount = jobs.filter(j => j.status === 'shortlisted' || j.status === 'applied').length;
  const scannedCount = jobs.length;
  const needsReviewCount = jobs.filter(j => j.status === 'needs_review').length;
  const discardedCount = jobs.filter(j => j.status === 'discarded').length;

  const appliedJobs = jobs.filter(j => j.status === 'applied');
  const avgPacingSec = appliedJobs.length > 0
    ? (appliedJobs.reduce((acc, curr) => acc + (curr.pacingDelaySec || curr.pacing_delay_sec || 8), 0) / appliedJobs.length).toFixed(1)
    : '—';

  // ----- Tab lifecycle: stop agent when THIS tab is closed -----
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Stop agent cleanly before the tab closes
      clearTimeout(stepTimerRef.current);
      clearInterval(pacingTimerRef.current);
      fetch('http://localhost:3001/api/stop', { method: 'POST', keepalive: true }).catch(() => { });
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ----- Agent Automation Loop -----
  const stepTimerRef = useRef(null);
  const pacingTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      clearTimeout(stepTimerRef.current);
      clearInterval(pacingTimerRef.current);
    };
  }, []);


  // ----- CDP Test (calls backend) — deduped to avoid log spam -----
  const lastCDPTestRef = useRef(0);
  const handleTestCDP = async () => {
    const now = Date.now();
    // Throttle: don't test more than once every 4 seconds
    if (now - lastCDPTestRef.current < 4000) return;
    lastCDPTestRef.current = now;

    addLog('cdp', 'CDP TEST', `Probing Chrome DevTools Protocol at ${config.cdpEndpoint}...`);
    try {
      const res = await fetch('http://localhost:3001/api/cdp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: config.cdpEndpoint })
      });
      const data = await res.json();
      if (data.success) {
        setCdpStatus({ connected: true, port: 9222, tabTitle: data.tabTitle });
        addLog('cdp', 'CDP CONNECTED', `✅ Chrome attached! Tab: "${data.tabTitle}"`);
      } else {
        setCdpStatus(p => ({ ...p, connected: false, tabTitle: 'Disconnected' }));
        addLog('warn', 'CDP FAILED', data.error || 'Could not connect. Make sure Chrome has --remote-debugging-port=9222');
      }
    } catch (e) {
      addLog('warn', 'CDP OFFLINE', 'Backend server not reachable on port 3001. Ensure backend is running.');
    }
  };

  // ----- User Actions -----
  // "Run Penguin": check the profile, then let the user choose platforms
  const handleStart = () => {
    if (!isProfileReady(profile)) {
      addLog('warn', 'RESUME REQUIRED', '❌ Action blocked: Resume upload is compulsory! Please complete your profile and upload your resume first.');
      navigateTo('/profile');
      return;
    }
    setShowPlatformPicker(true);
  };

  // Starts the run on the chosen platforms. Returns { success, message } for the picker.
  const runPenguin = async (platforms) => {
    const runConfig = { ...config, platforms };
    handleSaveConfig(runConfig);
    try {
      const res = await authFetch('/api/start', {
        method: 'POST',
        body: JSON.stringify({ config: runConfig, profile, userId: currentUser?.id })
      });
      const data = await res.json();
      if (!data.success) {
        addLog('warn', 'RUNNER NOTICE', data.message || 'Could not start the agent.');
        return { success: false, message: data.message };
      }
      setRunProgress({ applied: 0, cap: config.maxApplications, platforms, platformIndex: -1 });
      setActiveJob(null);
      setAgentState('running');
      setRunWindow('open');
      return { success: true };
    } catch {
      addLog('warn', 'BACKEND OFFLINE', 'Could not reach backend on port 3001. Start server with npm run server.');
      return { success: false, message: 'Backend is not running. Start it with: npm run server' };
    }
  };

  const handleResume = () => {
    setAgentState('running');
    fetch('http://localhost:3001/api/resume', { method: 'POST' }).catch(() => { });
  };

  const handlePause = () => {
    setAgentState('paused');
    clearTimeout(stepTimerRef.current);
    clearInterval(pacingTimerRef.current);
    fetch('http://localhost:3001/api/pause', { method: 'POST' }).catch(() => { });
    addLog('warn', 'AGENT PAUSED', 'Agent paused by operator. Chrome CDP session preserved.');
  };

  const handleStop = () => {
    setAgentState('idle');
    setRunWindow('hidden');
    clearTimeout(stepTimerRef.current);
    clearInterval(pacingTimerRef.current);
    setPacingCountdown(0);
    fetch('http://localhost:3001/api/stop', { method: 'POST' }).catch(() => { });
    addLog('warn', 'AGENT STOPPED', 'Execution halted. Standing by.');
  };

  const handleReset = () => {
    handleStop();
    setActiveJob(null);
    setCurrentStep(0);
    loadJobsFromSupabase(currentUser);
    addLog('cdp', 'RESET', 'Refreshed data from Supabase.');
  };

  const handleStepApply = async () => {
    // Gatekeeper: Enforce mandatory resume upload & profile completion
    if (!isProfileReady(profile)) {
      addLog('warn', 'RESUME REQUIRED', '❌ Action blocked: Resume upload is compulsory! Please complete your profile and upload your resume first.');
      navigateTo('/profile');
      return;
    }

    setAgentState('running');
    addLog('cdp', 'STEP RUN', 'Executing single application step via Chrome CDP...');
    try {
      const res = await authFetch('/api/step', {
        method: 'POST',
        body: JSON.stringify({ userId: currentUser?.id })
      });
      const data = await res.json();
      if (!data.success) {
        addLog('warn', 'STEP NOTICE', data.error || data.message || 'Step could not be completed.');
        setAgentState('idle');
      }
    } catch (e) {
      addLog('warn', 'BACKEND OFFLINE', 'Backend server not reachable on port 3001.');
      setAgentState('idle');
    }
  };

  const handleApplyManual = (jobId) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
    const targetJob = jobs.find(j => j.id === jobId);
    const updated = { ...targetJob, status: 'applied', appliedAt: timeStr, applied_at: new Date().toISOString(), stepsCompleted: targetJob?.stepsTotal || 3 };
    setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    if (currentUser && targetJob) syncAppliedJobToSupabase(currentUser, updated);
    addLog('success', 'MANUAL OVERRIDE', `Job marked as applied via manual operator confirmation.`);
  };

  const handleMarkApplied = (jobId) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }) + ' IST';
    const targetJob = jobs.find(j => j.id === jobId);
    const updated = { ...targetJob, status: 'applied', appliedAt: timeStr, applied_at: new Date().toISOString(), stepsCompleted: targetJob?.stepsTotal || 3 };
    setJobs(prev => prev.map(j => j.id === jobId ? updated : j));
    if (currentUser && targetJob) syncAppliedJobToSupabase(currentUser, updated);
    addLog('cdp', 'STATUS OVERRIDE', `Job ${jobId} forced to 'Applied' state.`);
  };

  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); } catch (e) { }
    setCurrentUser(null);
    setJobs([]);
    setLogs([]);
  };

  // ----- Render Gates -----
  if (authChecking) {
    return (
      <div className="penguin-loading-screen">
        <div className="penguin-loading-card animate-slide-up">
          <PenguinAvatar mode="loading" size={140} />
          <h2 className="loading-penguin-title">Penguin is Waking Up… 🐧</h2>
          <p className="loading-penguin-desc">
            Waddling into your cloud workspace &amp; verifying credentials
          </p>
          <div className="penguin-loading-dots">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage key={loginNotice} notice={loginNotice} onLoginSuccess={(u) => { setLoginNotice(''); setCurrentUser(u); }} />;
  }

  const closeOverlay = (overlayPaths, setOpen) => {
    setOpen(false);
    if (overlayPaths.includes(window.location.pathname.toLowerCase())) {
      const back = currentView === 'dashboard'
        ? (DASHBOARD_TABS.find(t => t.key === dashTab)?.path || '/dashboard')
        : '/assistant';
      navigateTo(back, true);
    }
  };

  const sharedOverlays = (
    <>
      <AgentControlPanel
        key={isConfigOpen ? 'open' : 'closed'}
        isOpen={isConfigOpen}
        onClose={() => closeOverlay(['/config', '/settings'], setIsConfigOpen)}
        config={config}
        onSaveConfig={handleSaveConfig}
        onOpenProfile={() => { setIsConfigOpen(false); navigateTo('/profile'); }}
        onOpenCdp={() => { setIsConfigOpen(false); navigateTo('/cdp'); }}
      />
      <HowToRunModal
        isOpen={isHowToRunOpen}
        onClose={() => closeOverlay(['/how-to-run'], setIsHowToRunOpen)}
      />
      <PlatformPickerModal
        key={showPlatformPicker ? 'open' : 'closed'}
        isOpen={showPlatformPicker}
        onClose={() => setShowPlatformPicker(false)}
        initialSelection={Array.isArray(config.platforms) && config.platforms.length ? config.platforms : ['linkedin']}
        onRun={runPenguin}
        onOpenCdp={() => navigateTo('/cdp')}
      />
      {runWindow === 'open' && (
        <RunningPenguinOverlay
          agentState={agentState}
          progress={runProgress}
          activeJob={activeJob}
          lastLog={logs[logs.length - 1]}
          selectedPlatforms={config.platforms || []}
          maxCap={config.maxApplications}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
          onMinimize={() => setRunWindow('minimized')}
          onClose={() => setRunWindow('hidden')}
          onViewApplications={() => { setRunWindow('hidden'); navigateTo('/applications'); }}
        />
      )}
      {runWindow === 'minimized' && (
        <RunningPenguinPill
          agentState={agentState}
          progress={runProgress}
          maxCap={config.maxApplications}
          onOpen={() => setRunWindow('open')}
        />
      )}
    </>
  );

  // Standalone tool pages
  if (currentView === 'viso-dsa') {
    return (
      <VisoDsaPage
        onBack={() => navigateTo('/assistant')}
        onOpenDashboard={() => navigateTo('/dashboard')}
      />
    );
  }

  if (currentView === 'resume-analyzer') {
    return (
      <ResumeAnalyzerPage
        onBack={() => navigateTo('/assistant')}
        onOpenDashboard={() => navigateTo('/dashboard')}
      />
    );
  }

  // Penguin AI Assistant landing (minimal, no dashboard chrome)
  if (currentView === 'assistant') {
    if (!enteredPenguinWorld) {
      const greetName = (profile?.name || currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || '').split(' ')[0];
      return (
        <PenguinWelcome
          firstName={greetName}
          onEnter={() => {
            try { sessionStorage.setItem('pg_entered_world', '1'); } catch { /* storage unavailable */ }
            setWorldJustEntered(true);
            setEnteredPenguinWorld(true);
          }}
        />
      );
    }
    return (
      <div className={`ambo-wrapper ${worldJustEntered ? 'pw-world-enter' : ''}`} onAnimationEnd={() => setWorldJustEntered(false)}>
        <PenguinAssistantAI
          currentUser={currentUser}
          profile={profile}
          config={config}
          jobs={jobs}
          appliedCount={appliedCount}
          agentState={agentState}
          onStartAgent={handleStart}
          onOpenDashboard={() => navigateTo('/dashboard')}
          onOpenVisoDsa={() => navigateTo('/viso-dsa')}
          onOpenResumeAnalyzer={() => navigateTo('/resume-analyzer')}
          onOpenProfile={() => navigateTo('/profile')}
          onOpenSettings={() => navigateTo('/config')}
          onOpenHowToRun={() => navigateTo('/how-to-run')}
          onSaveProfile={handleSaveProfile}
          onSaveConfig={handleSaveConfig}
          isProfileReady={isProfileReady}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSignOut={handleSignOut}
        />
        {sharedOverlays}
      </div>
    );
  }

  const profileReady = isProfileReady(profile);
  const isAgentActive = agentState === 'running' || agentState === 'paused';

  const renderTab = () => {
    if (detailPageJob) {
      return <ApplicationDetailPage job={detailPageJob} onBack={() => setDetailPageJob(null)} />;
    }
    switch (dashTab) {
      case 'live':
        return (
          <div className="pg-tab-body">
            {isAgentActive && (
              <PenguinRunningPage
                jobs={jobs}
                agentState={agentState}
                activeJob={activeJob}
                currentStep={currentStep}
                pacingCountdown={pacingCountdown}
                appliedCount={appliedCount}
                maxCap={config.maxApplications}
                onPause={handlePause}
                onResume={handleResume}
                onStop={handleStop}
                onSwitchToDashboard={() => openTab('applications')}
                onViewDetail={(job) => setDetailPageJob(job)}
                config={config}
              />
            )}
            <LiveBrowserViewport
              currentJob={activeJob}
              currentStep={currentStep}
              agentState={agentState}
              pacingCountdown={pacingCountdown}
            />
          </div>
        );
      case 'applications':
        return (
          <>
          <PlatformsBanner onRun={handleStart} />
          <MarketInsights
            locations={searchLocations(config)}
            roles={Array.isArray(config.searchQueries) && config.searchQueries.length ? config.searchQueries : [config.searchQuery].filter(Boolean)}
            onEditSettings={() => navigateTo('/config')}
          />
          <JobsTable
            jobs={jobs}
            activeJobId={activeJob?.id}
            onSelectJob={(job) => setSelectedDetailJob(job)}
            onViewDetail={(job) => setDetailPageJob(job)}
            isLoadingFromDB={isLoadingFromDB}
            onRefresh={() => loadJobsFromSupabase(currentUser)}
            isProfileComplete={profileReady}
            onIncompleteProfile={() => navigateTo('/profile')}
            userName={profile?.name || currentUser?.user_metadata?.full_name || currentUser?.email || ''}
          />
          </>
        );
      case 'activity':
        return (
          <div className="pg-activity-tab">
            <LiveExecutionTrace logs={logs} onClearLogs={() => setLogs([])} />
          </div>
        );
      case 'profile':
        return (
          <ProfileTab
            profile={profile}
            onSaveProfile={handleSaveProfile}
            config={config}
            onSaveConfig={handleSaveConfig}
            currentUser={currentUser}
            isProfileReady={profileReady}
          />
        );
      case 'cdp':
        return (
          <CdpTab
            cdpStatus={cdpStatus}
            config={config}
            onSaveConfig={handleSaveConfig}
            onTestCDP={handleTestCDP}
            logs={logs}
          />
        );
      default:
        return (
          <OverviewTab
            jobs={jobs}
            logs={logs}
            config={config}
            onOpenTab={openTab}
            onViewDetail={(job) => setDetailPageJob(job)}
            metrics={{
              scannedCount,
              shortlistedCount,
              appliedCount,
              needsReviewCount,
              discardedCount,
              avgPacingSec
            }}
          />
        );
    }
  };

  return (
    <div className="app-layout pg-shell">
      <Sidebar
        activeTab={detailPageJob ? 'applications' : dashTab}
        onChangeTab={openTab}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        tabCounts={{ applications: jobs.length }}
        isRunning={agentState === 'running'}
        isProfileComplete={profileReady}
        cdpConnected={cdpStatus.connected}
      />

      <div className="pg-shell-main">
      <Header
        agentState={agentState}
        onStart={handleStart}
        onPause={handlePause}
        onStop={handleStop}
        onReset={handleReset}
        onSimulateStep={handleStepApply}
        theme={theme}
        onToggleTheme={toggleTheme}
        cdpStatus={cdpStatus}
        appliedCount={appliedCount}
        maxCap={config.maxApplications}
        onOpenSettings={() => navigateTo('/config')}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onTestCDP={handleTestCDP}
        onOpenHowToRun={() => navigateTo('/how-to-run')}
        onOpenProfilePage={() => navigateTo('/profile')}
        isProfileComplete={profileReady}
        currentView={currentView}
        onChangeView={(v) => navigateTo(v === 'dashboard' ? '/dashboard' : `/${v}`)}
        pageTitle={detailPageJob ? 'Application details' : (DASHBOARD_TABS.find(t => t.key === dashTab)?.label || '')}
        onOpenMobileNav={() => setMobileNavOpen(true)}
        onOpenCdp={() => openTab('cdp')}
        onResume={handleResume}
        roles={Array.isArray(config.searchQueries) && config.searchQueries.length ? config.searchQueries : [config.searchQuery].filter(Boolean)}
        locations={searchLocations(config)}
        runProgress={runProgress}
      />

      <main className="dashboard-content pg-main">
        {!profileReady && dashTab !== 'profile' && (
          <div className="pg-callout">
            <div>
              <strong>Finish your profile to start applying</strong>
              <span>
                {!profile.resumeFile
                  ? 'Upload your resume. Easy Apply needs a CV file to attach.'
                  : missingScreeningAnswers(profile.screeningAnswers).length
                    ? 'Answer the application questions (like "Why should we hire you?") so Penguin can fill them in for you.'
                    : 'Add your name, email and phone so the agent can fill contact details.'}
              </span>
            </div>
            <button className="pg-btn pg-btn-primary" onClick={() => navigateTo('/profile')}>
              Complete profile
            </button>
          </div>
        )}

        {!detailPageJob && dashTab !== 'cdp' && (
          <CdpReminder
            connected={cdpStatus.connected}
            onOpenCdp={() => openTab('cdp')}
            onConnected={handleTestCDP}
          />
        )}

        {renderTab()}
      </main>
      </div>

      {/* Post-Login Welcome Baby Penguin Celebration Modal (only shown when profile setup prompt is not active) */}
      {showWelcomePenguin && !showProfileSetupPrompt && !isProfilePageOpen && (
        <div className="modal-backdrop animate-fade-in" style={{ zIndex: 1200 }} onClick={() => setShowWelcomePenguin(false)}>
          <div className="modal-card penguin-welcome-card animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="welcome-penguin-top">
              <PenguinAvatar mode="welcome" size={130} />
            </div>
            <div className="welcome-penguin-body">
              <div className="welcome-badge">BABY PENGUIN AI READY</div>
              <h2 className="welcome-title">
                Hi {currentUser?.user_metadata?.name || 'Subhash'}! I'm Penguin 🐧✨
              </h2>
              <p className="welcome-subtitle">
                Your autonomous baby penguin assistant for LinkedIn Easy Apply jobs.
              </p>
              <div className="welcome-features-grid">
                <div className="welcome-feature-card">
                  <span className="feat-emoji">🚀</span>
                  <div className="feat-text">
                    <strong>Auto Easy Apply</strong>
                    <span>Inspects listings, clicks modal buttons &amp; fills fields</span>
                  </div>
                </div>
                <div className="welcome-feature-card">
                  <span className="feat-emoji">📄</span>
                  <div className="feat-text">
                    <strong>Resume Auto-Upload</strong>
                    <span>Attaches your dedicated PDF CV automatically</span>
                  </div>
                </div>
                <div className="welcome-feature-card">
                  <span className="feat-emoji">🛡️</span>
                  <div className="feat-text">
                    <strong>Safe Human Pacing</strong>
                    <span>Natural delay curves to prevent detection or rate-limits</span>
                  </div>
                </div>
              </div>
              <div className="welcome-actions">
                <button
                  className="btn btn-primary btn-welcome-action"
                  onClick={() => setShowWelcomePenguin(false)}
                >
                  <span>Let's Apply to Jobs! 🐧</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Setup Prompt Modal (shown after signup/login if profile is incomplete) */}
      <ProfileSetupModal
        isOpen={showProfileSetupPrompt}
        onClose={() => setShowProfileSetupPrompt(false)}
        onOpenProfilePage={() => navigateTo('/profile')}
        currentUser={currentUser}
      />

      <JobDetailModal
        job={selectedDetailJob}
        onClose={() => setSelectedDetailJob(null)}
        onApplyManual={handleApplyManual}
        onMarkApplied={handleMarkApplied}
      />

      {sharedOverlays}
    </div>
  );
}
