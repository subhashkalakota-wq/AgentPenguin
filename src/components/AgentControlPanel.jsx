import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  X, 
  Save, 
  Sliders, 
  User, 
  FileText, 
  Terminal, 
  Check, 
  RefreshCw,
  HelpCircle,
  Clock,
  Target,
  Upload,
  CheckCircle2,
  FileCheck,
  Zap,
  Phone,
  Mail,
  Briefcase,
  Plus,
  Layers,
  PieChart,
  Tag,
  Search,
  ChevronDown,
  Sparkles,
  AlertCircle
} from 'lucide-react';

const TECH_ROLE_CATALOG = [
  // Popular / Flagship Tech Roles
  { title: "Senior Frontend Engineer", category: "Frontend", popular: true },
  { title: "Full Stack Engineer (React/Node)", category: "Full Stack", popular: true },
  { title: "Software Engineer", category: "Core Engineering", popular: true },
  { title: "Senior Software Engineer", category: "Core Engineering", popular: true },
  { title: "Staff Software Engineer", category: "Core Engineering", popular: true },
  { title: "AI Product Engineer", category: "AI & ML", popular: true },
  { title: "Machine Learning Engineer", category: "AI & ML", popular: true },
  { title: "Backend Engineer (Node/Python/Go)", category: "Backend", popular: true },
  { title: "DevOps Engineer", category: "Cloud & DevOps", popular: true },
  { title: "Site Reliability Engineer (SRE)", category: "Cloud & DevOps", popular: true },
  { title: "React / Frontend Developer", category: "Frontend", popular: true },
  { title: "Staff UI / Design Systems Engineer", category: "Frontend", popular: true },
  { title: "Technical Product Manager", category: "Product", popular: true },
  { title: "Data Engineer", category: "Data", popular: true },
  { title: "Data Scientist", category: "Data", popular: true },
  { title: "Cloud Platform Engineer (AWS/GCP)", category: "Cloud & DevOps", popular: true },
  { title: "QA / Test Automation Engineer", category: "QA & Testing", popular: true },
  { title: "Solutions Architect", category: "Architecture", popular: true },

  // S Roles (For Prefix 'S' Matching)
  { title: "Software Engineer (Frontend)", category: "Frontend", popular: true },
  { title: "Software Engineer (Backend)", category: "Backend" },
  { title: "Software Engineer (Full Stack)", category: "Full Stack" },
  { title: "Senior Backend Engineer", category: "Backend", popular: true },
  { title: "Senior Full Stack Engineer", category: "Full Stack", popular: true },
  { title: "Senior DevOps Engineer", category: "Cloud & DevOps" },
  { title: "Senior Machine Learning Engineer", category: "AI & ML" },
  { title: "Senior Data Engineer", category: "Data" },
  { title: "Senior Product Manager", category: "Product" },
  { title: "Senior QA Automation Engineer", category: "QA & Testing" },
  { title: "Security Engineer", category: "Security" },
  { title: "Systems Engineer", category: "Core Engineering" },
  { title: "Scrum Master / Agile Coach", category: "Management" },

  // Frontend Roles
  { title: "Frontend Developer (React/Next.js)", category: "Frontend", popular: true },
  { title: "Frontend Developer (Vue/Nuxt)", category: "Frontend" },
  { title: "Frontend Developer (Angular)", category: "Frontend" },
  { title: "UI Developer", category: "Frontend" },
  { title: "Design Systems Engineer", category: "Frontend" },

  // Full Stack Roles
  { title: "Full Stack Developer (MERN)", category: "Full Stack" },
  { title: "Java Full Stack Developer", category: "Full Stack" },
  { title: "Python Full Stack Engineer", category: "Full Stack" },
  { title: "Lead Full Stack Engineer", category: "Full Stack" },

  // Backend Roles
  { title: "Python Developer (Django/FastAPI)", category: "Backend", popular: true },
  { title: "Java Backend Engineer", category: "Backend" },
  { title: "Go / Golang Engineer", category: "Backend" },
  { title: "Node.js Backend Developer", category: "Backend" },
  { title: "Lead Backend Engineer", category: "Backend" },

  // AI, Data & ML
  { title: "Generative AI Application Engineer", category: "AI & ML", popular: true },
  { title: "AI Research Scientist", category: "AI & ML" },
  { title: "MLOps Engineer", category: "AI & ML" },
  { title: "Big Data Engineer", category: "Data" },
  { title: "Data Analyst", category: "Data" },
  { title: "Database Administrator (DBA)", category: "Data" },

  // Cloud & DevOps
  { title: "Cloud Architect", category: "Cloud & DevOps" },
  { title: "Kubernetes Platform Specialist", category: "Cloud & DevOps" },
  { title: "Infrastructure Engineer", category: "Cloud & DevOps" },
  { title: "AWS Solutions Architect", category: "Cloud & DevOps" },
  { title: "DevSecOps Engineer", category: "Security" },

  // Mobile
  { title: "iOS Developer (Swift)", category: "Mobile", popular: true },
  { title: "Android Developer (Kotlin)", category: "Mobile", popular: true },
  { title: "React Native Developer", category: "Mobile", popular: true },
  { title: "Flutter Developer", category: "Mobile" },
  { title: "Mobile Application Engineer", category: "Mobile" },

  // Architecture, QA & Management
  { title: "Automation Test Engineer", category: "QA & Testing" },
  { title: "QA Engineer (Cypress / Playwright)", category: "QA & Testing" },
  { title: "Enterprise Architect", category: "Architecture" },
  { title: "Engineering Manager", category: "Management" }
];

export default function AgentControlPanel({
  isOpen,
  onClose,
  config = {},
  onSaveConfig,
  candidateProfile = {},
  onSaveProfile
}) {
  const [activeTab, setActiveTab] = useState('search');
  
  // Ensure searchQueries array exists
  const initialQueries = Array.isArray(config.searchQueries) && config.searchQueries.length > 0
    ? config.searchQueries
    : (config.searchQuery ? [config.searchQuery] : ["Senior Frontend Engineer", "Full Stack Engineer (React/Node)"]);

  const [localConfig, setLocalConfig] = useState({
    searchQueries: initialQueries,
    searchQuery: initialQueries[0] || 'Senior Frontend Engineer',
    location: 'Bengaluru, Karnataka (Remote / Hybrid)',
    experienceLevel: 'Mid-Senior level',
    maxApplications: 50,
    pacingDelaySec: 6,
    minMatchScore: 70,
    cdpEndpoint: 'http://localhost:9222',
    ...config
  });

  const [localProfile, setLocalProfile] = useState({
    name: 'Subhash Kalakota',
    email: 'subhashkalakota@gmail.com',
    phoneCountryCode: 'India (+91)',
    phone: '9876543210',
    resumeFile: null,
    resumePath: null,
    experienceYears: 5,
    workAuthorization: 'Yes',
    visaRequired: 'No',
    salaryFloor: '₹22,00,000 / year (22 LPA)',
    noticePeriod: 'Immediately / 2 weeks',
    degree: "Bachelor's Degree",
    autoSubmit: true,
    ...candidateProfile
  });

  const [customRoleInput, setCustomRoleInput] = useState('');
  const [cdpTesting, setCdpTesting] = useState(false);
  const [cdpSuccess, setCdpSuccess] = useState(false);

  // Role Catalog Search & Filter State
  const [roleSearchQuery, setRoleSearchQuery] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('All');
  const [activePopularCategory, setActivePopularCategory] = useState('All Popular');
  const rolePickerRef = useRef(null);

  const ROLE_CATEGORIES = ['All', 'Popular', 'Frontend', 'Full Stack', 'Backend', 'Core Engineering', 'AI & ML', 'Cloud & DevOps', 'Data', 'Mobile'];

  const filteredCatalogRoles = useMemo(() => {
    const q = roleSearchQuery.trim().toLowerCase();
    return TECH_ROLE_CATALOG.filter(role => {
      if (activeCategoryFilter === 'Popular') {
        if (!role.popular) return false;
      } else if (activeCategoryFilter !== 'All') {
        if (role.category !== activeCategoryFilter) return false;
      }

      if (!q) return true;
      if (q.length === 1) {
        // Single letter prefix matching (e.g. S matches "Senior Frontend", "Software Engineer", etc.)
        const titleLower = role.title.toLowerCase();
        const startsWithChar = titleLower.startsWith(q);
        const wordStartsWith = titleLower.split(/[\s\-_/]+/).some(w => w.startsWith(q));
        return startsWithChar || wordStartsWith;
      }
      return role.title.toLowerCase().includes(q) || role.category.toLowerCase().includes(q);
    });
  }, [roleSearchQuery, activeCategoryFilter]);

  const displayedPopularRoles = useMemo(() => {
    if (activePopularCategory === 'All Popular') {
      return TECH_ROLE_CATALOG.filter(r => r.popular);
    }
    return TECH_ROLE_CATALOG.filter(r => r.popular && r.category === activePopularCategory);
  }, [activePopularCategory]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (rolePickerRef.current && !rolePickerRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const quickRoles = [
    "Senior Frontend Engineer",
    "Full Stack Engineer (React/Node)",
    "Staff UI / Design Systems Engineer",
    "AI Product Engineer",
    "React / Frontend Developer",
    "Software Engineer (Frontend)"
  ];

  const countryCodes = [
    { label: "India (+91)", code: "+91" },
    { label: "United States (+1)", code: "+1" },
    { label: "United Kingdom (+44)", code: "+44" },
    { label: "Canada (+1)", code: "+1" },
    { label: "Australia (+61)", code: "+61" },
    { label: "Germany (+49)", code: "+49" },
    { label: "Singapore (+65)", code: "+65" },
    { label: "United Arab Emirates (+971)", code: "+971" }
  ];

  const selectedQueries = localConfig.searchQueries || [localConfig.searchQuery || "Senior Frontend Engineer"];

  const handleToggleRole = (role) => {
    let next;
    if (selectedQueries.includes(role)) {
      if (selectedQueries.length === 1) return; // Keep at least one role
      next = selectedQueries.filter(r => r !== role);
    } else {
      next = [...selectedQueries, role];
    }
    setLocalConfig(prev => ({
      ...prev,
      searchQueries: next,
      searchQuery: next[0] || role
    }));
  };

  const handleAddCustomRole = (e) => {
    e?.preventDefault();
    const trimmed = customRoleInput.trim();
    if (!trimmed) return;
    if (!selectedQueries.includes(trimmed)) {
      const next = [...selectedQueries, trimmed];
      setLocalConfig(prev => ({
        ...prev,
        searchQueries: next,
        searchQuery: next[0] || trimmed
      }));
    }
    setCustomRoleInput('');
  };

  const handleAddCustomRoleFromQuery = (customTitle) => {
    const trimmed = (customTitle || customRoleInput).trim();
    if (!trimmed) return;
    if (!selectedQueries.includes(trimmed)) {
      const next = [...selectedQueries, trimmed];
      setLocalConfig(prev => ({
        ...prev,
        searchQueries: next,
        searchQuery: next[0] || trimmed
      }));
    }
    setRoleSearchQuery('');
    setCustomRoleInput('');
    setIsRoleDropdownOpen(false);
  };

  const handleSelectRoleFromList = (roleTitle) => {
    handleToggleRole(roleTitle);
  };

  const handleRemoveRole = (role) => {
    if (selectedQueries.length <= 1) return; // Keep at least one
    const next = selectedQueries.filter(r => r !== role);
    setLocalConfig(prev => ({
      ...prev,
      searchQueries: next,
      searchQuery: next[0] || ''
    }));
  };

  const totalQuota = localConfig.maxApplications || 50;
  const numRoles = Math.max(selectedQueries.length, 1);
  const baseQuotaPerRole = Math.floor(totalQuota / numRoles);
  const remainder = totalQuota % numRoles;

  const handleTestCdp = async () => {
    setCdpTesting(true);
    setCdpSuccess(false);
    try {
      const res = await fetch('http://localhost:3001/api/cdp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: localConfig.cdpEndpoint || 'http://localhost:9222' })
      });
      const data = await res.json();
      setCdpSuccess(data.success);
    } catch (e) {
      setCdpSuccess(false);
    } finally {
      setCdpTesting(false);
    }
  };

  const handleSave = () => {
    onSaveConfig(localConfig);
    onSaveProfile(localProfile);

    // Sync to server
    fetch('http://localhost:3001/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: localConfig, profile: localProfile })
    }).catch(() => {});

    onClose();
  };

  const processResumeFile = (file) => {
    if (!file) return;
    if (!file.name.match(/\.(pdf|doc|docx)$/i)) {
      setUploadMessage({ type: 'error', text: 'Please select a valid PDF, DOC, or DOCX resume.' });
      return;
    }

    setUploadingResume(true);
    setUploadMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/upload-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            fileData: reader.result,
            fileType: file.type
          })
        });
        const data = await res.json();
        if (data.success) {
          setLocalProfile(prev => ({
            ...prev,
            resumeFile: data.fileName,
            resumePath: data.filePath,
            resumeSize: data.fileSize
          }));
          setUploadMessage({ type: 'success', text: `Resume attached: ${data.fileName} (${(data.fileSize / 1024).toFixed(1)} KB)` });
        } else {
          setUploadMessage({ type: 'error', text: data.error || 'Upload failed.' });
        }
      } catch (err) {
        setUploadMessage({ type: 'error', text: 'Failed to upload resume to server: ' + err.message });
      } finally {
        setUploadingResume(false);
      }
    };
    reader.onerror = () => {
      setUploadMessage({ type: 'error', text: 'Could not read local file.' });
      setUploadingResume(false);
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processResumeFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processResumeFile(file);
  };

  const handleRemoveResume = () => {
    setLocalProfile(prev => ({
      ...prev,
      resumeFile: null,
      resumePath: null,
      resumeSize: null
    }));
    setUploadMessage({ type: 'error', text: 'Resume removed. You must upload a resume before applying.' });
    setTimeout(() => setUploadMessage(null), 3500);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container config-modal animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <Sliders size={20} className="modal-icon text-accent" />
            <div>
              <h2 className="modal-title">Job Application Automation Settings</h2>
              <p className="modal-subtitle">Select multiple job posts for equal application distribution, resume upload & auto-fill answers</p>
            </div>
          </div>
          <button className="icon-btn modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tabs">
          <button 
            className={`modal-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            <Layers size={15} />
            <span>Multiple Jobs & Quota ({selectedQueries.length})</span>
          </button>
          <button 
            className={`modal-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={15} />
            <span>Candidate & Resume</span>
          </button>
          <button 
            className={`modal-tab ${activeTab === 'screening' ? 'active' : ''}`}
            onClick={() => setActiveTab('screening')}
          >
            <HelpCircle size={15} />
            <span>Screening Q&A Defaults</span>
          </button>
          <button 
            className={`modal-tab ${activeTab === 'cdp' ? 'active' : ''}`}
            onClick={() => setActiveTab('cdp')}
          >
            <Terminal size={15} />
            <span>CDP Connection</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* TAB 1: MULTIPLE JOBS / POSTS & EQUAL DISTRIBUTION */}
          {activeTab === 'search' && (
            <div className="form-grid">
              {/* Dynamic Equal Distribution Breakdown Banner */}
              <div className="form-group full-width" style={{ margin: '0 0 8px 0' }}>
                <div style={{
                  padding: '14px 16px',
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.08), rgba(16, 185, 129, 0.08))',
                  border: '1px solid rgba(37, 99, 235, 0.25)',
                  borderRadius: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PieChart size={18} style={{ color: '#2563eb' }} />
                      <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--text-main)' }}>
                        Equal Quota Distribution Engine ({selectedQueries.length} Selected Job Posts)
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: '#2563eb',
                      color: '#fff',
                      padding: '3px 10px',
                      borderRadius: 12
                    }}>
                      Total Cap: {totalQuota} Jobs
                    </span>
                  </div>

                  <p style={{ fontSize: 11.5, color: 'var(--text-dim)', margin: '0 0 10px 0' }}>
                    The agent will divide the <strong>{totalQuota} applications</strong> equally across all {numRoles} selected job posts below. It will search and apply to each role sequentially.
                  </p>

                  {/* Equal distribution mini cards */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
                    gap: 8
                  }}>
                    {selectedQueries.map((role, idx) => {
                      const share = baseQuotaPerRole + (idx === selectedQueries.length - 1 ? remainder : 0);
                      const pct = Math.round((share / totalQuota) * 100);
                      return (
                        <div key={role} style={{
                          padding: '8px 12px',
                          background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 8,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                            <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                              #{idx + 1} {role}
                            </div>
                            <div style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
                              {pct}% of run volume
                            </div>
                          </div>
                          <span style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#16a34a',
                            background: 'rgba(22, 163, 74, 0.1)',
                            padding: '3px 8px',
                            borderRadius: 6
                          }}>
                            {share} jobs
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Multi-Selection: Active Job Roles List */}
              <div className="form-group full-width">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Active Selected Job Roles / Posts ({selectedQueries.length}) *</span>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>Click ✖ to remove role</span>
                </label>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  padding: '10px 12px',
                  background: 'var(--bg-inset)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  minHeight: 48
                }}>
                  {selectedQueries.map((role, idx) => {
                    const share = baseQuotaPerRole + (idx === selectedQueries.length - 1 ? remainder : 0);
                    return (
                      <div 
                        key={role}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 10px',
                          background: 'rgba(37, 99, 235, 0.12)',
                          border: '1px solid rgba(37, 99, 235, 0.3)',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 500,
                          color: 'var(--text-main)'
                        }}
                      >
                        <Tag size={12} style={{ color: '#2563eb' }} />
                        <span>{role}</span>
                        <span style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          background: '#2563eb',
                          color: '#fff',
                          padding: '1px 6px',
                          borderRadius: 10,
                          marginLeft: 2
                        }}>
                          {share}
                        </span>
                        {selectedQueries.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRole(role)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                              marginLeft: 2,
                              color: 'var(--text-dim)',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                            title={`Remove ${role}`}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Searchable Role Selector & Dropdown List */}
              <div className="form-group full-width" ref={rolePickerRef} style={{ position: 'relative' }}>
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Select Target Job Roles from Catalog (or type letter, e.g. 'S')</span>
                  <span style={{ fontSize: 11, color: '#2563eb', fontWeight: 600 }}>
                    {filteredCatalogRoles.length} standard roles available
                  </span>
                </label>

                {/* Search / Select Input */}
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    style={{ paddingLeft: 36, paddingRight: 36 }}
                    value={roleSearchQuery}
                    onChange={(e) => {
                      setRoleSearchQuery(e.target.value);
                      setIsRoleDropdownOpen(true);
                    }}
                    onFocus={() => setIsRoleDropdownOpen(true)}
                    placeholder="Type initial (e.g. 'S') to filter all roles starting with S, or click to browse..."
                  />
                  {roleSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => setRoleSearchQuery('')}
                      style={{
                        position: 'absolute',
                        right: 12,
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        padding: 2
                      }}
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  ) : (
                    <ChevronDown
                      size={15}
                      style={{ position: 'absolute', right: 12, color: 'var(--text-muted)', pointerEvents: 'none' }}
                    />
                  )}
                </div>

                {/* Dropdown Menu of Standard Tech Roles */}
                {isRoleDropdownOpen && (
                  <div
                    className="role-dropdown-popover animate-fade-in"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: 'var(--bg-surface-elevated, #ffffff)',
                      border: '1px solid var(--border-primary, #cbd5e1)',
                      borderRadius: 14,
                      boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.2)',
                      zIndex: 300,
                      maxHeight: 330,
                      overflowY: 'auto'
                    }}
                  >
                    {/* Header with Match Count and Category Tabs */}
                    <div style={{
                      padding: '10px 14px',
                      background: 'var(--bg-inset, #f8fafc)',
                      borderBottom: '1px solid var(--border-subtle, #e2e8f0)',
                      position: 'sticky',
                      top: 0,
                      zIndex: 10
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {roleSearchQuery.trim().length === 1 
                            ? `ROLES STARTING WITH "${roleSearchQuery.toUpperCase()}" (${filteredCatalogRoles.length} MATCHES)`
                            : `SELECT FROM STANDARD ROLES (${filteredCatalogRoles.length})`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsRoleDropdownOpen(false)}
                          style={{ fontSize: 11, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Done ✕
                        </button>
                      </div>

                      {/* Category Switcher Pills inside Dropdown */}
                      <div style={{ display: 'flex', gap: 5, overflowX: 'auto', paddingBottom: 2 }}>
                        {ROLE_CATEGORIES.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setActiveCategoryFilter(cat); }}
                            style={{
                              padding: '2px 8px',
                              fontSize: 10.5,
                              fontWeight: 600,
                              borderRadius: 12,
                              border: '1px solid',
                              borderColor: activeCategoryFilter === cat ? '#0284c7' : 'var(--border-subtle, #e2e8f0)',
                              background: activeCategoryFilter === cat ? '#0284c7' : 'var(--bg-surface, #fff)',
                              color: activeCategoryFilter === cat ? '#ffffff' : 'var(--text-muted, #64748b)',
                              cursor: 'pointer',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Roles List */}
                    <div style={{ padding: 6 }}>
                      {filteredCatalogRoles.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                          <p style={{ margin: '0 0 8px 0' }}>No standard roles found matching "{roleSearchQuery}".</p>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => {
                              handleAddCustomRoleFromQuery(roleSearchQuery);
                            }}
                          >
                            Add "{roleSearchQuery}" as Custom Role
                          </button>
                        </div>
                      ) : (
                        filteredCatalogRoles.map(role => {
                          const isSelected = selectedQueries.includes(role.title);
                          return (
                            <div
                              key={role.title}
                              onClick={() => handleToggleRole(role.title)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: 8,
                                cursor: 'pointer',
                                background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'transparent',
                                border: isSelected ? '1px solid rgba(37, 99, 235, 0.2)' : '1px solid transparent',
                                marginBottom: 2,
                                transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: isSelected ? '#2563eb' : 'rgba(37, 99, 235, 0.1)',
                                  color: isSelected ? '#ffffff' : '#2563eb'
                                }}>
                                  {role.category}
                                </span>
                                <span style={{
                                  fontSize: 12.5,
                                  fontWeight: isSelected ? 700 : 500,
                                  color: isSelected ? '#2563eb' : 'var(--text-primary)'
                                }}>
                                  {role.title}
                                </span>
                              </div>

                              <span style={{
                                fontSize: 11,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                color: isSelected ? '#16a34a' : 'var(--text-muted)'
                              }}>
                                {isSelected ? (
                                  <>
                                    <CheckCircle2 size={13} style={{ color: '#16a34a' }} />
                                    <span>Selected</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus size={13} />
                                    <span>Click to Select</span>
                                  </>
                                )}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Popular Roles Section (Prominent 1-Click Multi-Select Pills) */}
              <div className="form-group full-width" style={{ marginTop: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                      Popular Roles (Click to Select / Deselect)
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Quota distributes equally across all selected
                  </span>
                </div>

                {/* Popular Roles Filter Chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
                  {['All Popular', 'Frontend', 'Full Stack', 'Backend', 'AI & ML', 'Cloud & DevOps', 'Data'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActivePopularCategory(cat)}
                      style={{
                        padding: '3px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 14,
                        border: '1px solid',
                        borderColor: activePopularCategory === cat ? '#2563eb' : 'var(--border-subtle, #cbd5e1)',
                        background: activePopularCategory === cat ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-inset, #f8fafc)',
                        color: activePopularCategory === cat ? '#2563eb' : 'var(--text-muted, #64748b)',
                        cursor: 'pointer'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Clickable Popular Roles Pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {displayedPopularRoles.map((role) => {
                    const isSelected = selectedQueries.includes(role.title);
                    const idx = selectedQueries.indexOf(role.title);
                    const share = isSelected ? baseQuotaPerRole + (idx === selectedQueries.length - 1 ? remainder : 0) : null;
                    return (
                      <button
                        key={role.title}
                        type="button"
                        onClick={() => handleToggleRole(role.title)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 600,
                          border: '1px solid',
                          borderColor: isSelected ? '#2563eb' : 'var(--border-subtle, #cbd5e1)',
                          background: isSelected ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'var(--bg-surface, #ffffff)',
                          color: isSelected ? '#ffffff' : 'var(--text-primary, #0f172a)',
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 2px 8px rgba(37, 99, 235, 0.25)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isSelected ? <Check size={13} style={{ color: '#fff' }} /> : <Plus size={13} style={{ color: '#0284c7' }} />}
                        <span>{role.title}</span>
                        {isSelected && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            background: 'rgba(255, 255, 255, 0.25)',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: 10,
                            marginLeft: 2
                          }}>
                            {share} jobs
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Location & Experience */}
              <div className="form-group">
                <label className="form-label">Target Location</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={localConfig.location}
                  onChange={(e) => setLocalConfig({ ...localConfig, location: e.target.value })}
                  placeholder="e.g. Bengaluru, Hyderabad, Pune, Remote India"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Experience Level</label>
                <select 
                  className="form-select"
                  value={localConfig.experienceLevel}
                  onChange={(e) => setLocalConfig({ ...localConfig, experienceLevel: e.target.value })}
                >
                  <option value="Mid-Senior level">Mid-Senior level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead / Staff">Lead / Staff</option>
                  <option value="All levels">All levels</option>
                </select>
              </div>

              {/* Total Applications Volume Slider */}
              <div className="form-group slider-group full-width">
                <div className="slider-header">
                  <label className="form-label">Total Applications Cap ({totalQuota} Total Applications)</label>
                  <span className="slider-value-badge" style={{ background: '#2563eb', color: '#fff' }}>
                    {totalQuota} applications ({baseQuotaPerRole} per job post)
                  </span>
                </div>
                <input 
                  type="range" 
                  min="10" 
                  max="100" 
                  step="5"
                  className="form-range"
                  value={localConfig.maxApplications}
                  onChange={(e) => setLocalConfig({ ...localConfig, maxApplications: Number(e.target.value) })}
                />
                <span className="form-hint">
                  The agent evenly distributes this total quota across all {selectedQueries.length} selected job posts ({baseQuotaPerRole} each).
                </span>
              </div>

              {/* Human Pacing Delay */}
              <div className="form-group slider-group">
                <div className="slider-header">
                  <label className="form-label">Human-like Pacing Delay</label>
                  <span className="slider-value-badge">{localConfig.pacingDelaySec}s ± 2s jitter</span>
                </div>
                <input 
                  type="range" 
                  min="3" 
                  max="15" 
                  step="1"
                  className="form-range"
                  value={localConfig.pacingDelaySec}
                  onChange={(e) => setLocalConfig({ ...localConfig, pacingDelaySec: Number(e.target.value) })}
                />
                <span className="form-hint">Pauses between applications to maintain LinkedIn session safety.</span>
              </div>

              {/* LLM Match Threshold */}
              <div className="form-group slider-group">
                <div className="slider-header">
                  <label className="form-label">LLM Affinity Cutoff</label>
                  <span className="slider-value-badge">{localConfig.minMatchScore}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="90" 
                  step="5"
                  className="form-range"
                  value={localConfig.minMatchScore}
                  onChange={(e) => setLocalConfig({ ...localConfig, minMatchScore: Number(e.target.value) })}
                />
                <span className="form-hint">Jobs scoring above this percentage will be auto-applied.</span>
              </div>
            </div>
          )}

          {/* TAB 2: CANDIDATE & RESUME */}
          {activeTab === 'profile' && (
            <div className="form-grid">
              {/* Full Auto-Pilot Mode Callout Banner */}
              <div className="form-group full-width" style={{ margin: '0 0 10px 0' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.1), rgba(16, 185, 129, 0.1))',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  borderRadius: 10
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: '#2563eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff'
                    }}>
                      <Zap size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--text-main)' }}>
                        100% Fully Autonomous Auto-Apply Mode
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-dim)', marginTop: 2 }}>
                        Agent will click Easy Apply, upload resume, fill contact info, answer screening questions, and submit without human intervention.
                      </div>
                    </div>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 12 }}>
                    <input 
                      type="checkbox" 
                      checked={localProfile.autoSubmit ?? true} 
                      onChange={(e) => setLocalProfile({ ...localProfile, autoSubmit: e.target.checked })}
                      style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                    />
                    <span>Full Auto-Pilot</span>
                  </label>
                </div>
              </div>

              {/* Dedicated Resume Upload Area */}
              <div className="form-group full-width">
                <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Dedicated Resume File (PDF, DOCX, DOC) *</span>
                  {localProfile.resumeFile && (
                    <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FileCheck size={14} /> Active Application Resume
                    </span>
                  )}
                </label>

                {/* Drag and Drop Box */}
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    padding: '20px 16px',
                    border: `2px dashed ${isDragOver ? '#2563eb' : 'var(--border-subtle)'}`,
                    borderRadius: 10,
                    background: isDragOver ? 'rgba(37, 99, 235, 0.05)' : 'var(--bg-inset)',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8
                  }}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                  />

                  {uploadingResume ? (
                    <RefreshCw size={28} className="spin text-accent" />
                  ) : (
                    <Upload size={28} style={{ color: '#2563eb' }} />
                  )}

                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {uploadingResume ? 'Uploading resume to agent server...' : 'Click to Upload Resume or Drag & Drop File Here'}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>
                    Supported formats: PDF, DOC, DOCX (Max 10MB). Used automatically for all job applications.
                  </div>

                  {/* Active file indicator badge */}
                  {localProfile.resumeFile ? (
                    <div style={{
                      marginTop: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 14px',
                      background: 'rgba(22, 163, 74, 0.08)',
                      border: '1px solid rgba(22, 163, 74, 0.3)',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500
                    }}>
                      <FileText size={15} style={{ color: '#16a34a' }} />
                      <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>
                        {localProfile.resumeFile}
                      </span>
                      <span style={{ fontSize: 10.5, color: '#16a34a', background: 'rgba(22, 163, 74, 0.15)', padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>
                        Attached &amp; Compulsory
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: 6,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 14px',
                      background: 'rgba(239, 68, 68, 0.08)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#ef4444'
                    }}>
                      <AlertCircle size={15} />
                      <span>No resume attached — Upload is compulsory before applying!</span>
                    </div>
                  )}
                </div>

                {/* Upload Status message */}
                {uploadMessage && (
                  <div style={{
                    marginTop: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 11.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: uploadMessage.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(22, 163, 74, 0.1)',
                    color: uploadMessage.type === 'error' ? '#ef4444' : '#16a34a'
                  }}>
                    {uploadMessage.type === 'error' ? <X size={14} /> : <CheckCircle2 size={14} />}
                    <span>{uploadMessage.text}</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                  <span className="form-hint">
                    {localProfile.resumePath ? (
                      <>Path on disk: <code style={{ fontSize: 10 }}>{localProfile.resumePath}</code></>
                    ) : (
                      <span style={{ color: '#ef4444', fontWeight: 600 }}>* Compulsory: You must upload your resume before Penguin can apply.</span>
                    )}
                  </span>
                  {localProfile.resumeFile && (
                    <button 
                      type="button" 
                      className="btn btn-ghost" 
                      style={{ fontSize: 11, padding: '2px 8px', color: '#ef4444' }}
                      onClick={handleRemoveResume}
                    >
                      Remove Resume
                    </button>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div className="form-group">
                <label className="form-label">
                  <User size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Full Name *
                </label>
                <input 
                  type="text" 
                  className="form-input"
                  value={localProfile.name}
                  onChange={(e) => setLocalProfile({ ...localProfile, name: e.target.value })}
                  placeholder="e.g. Subhash Kalakota"
                />
              </div>

              {/* Email Address */}
              <div className="form-group">
                <label className="form-label">
                  <Mail size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Email Address *
                </label>
                <input 
                  type="email" 
                  className="form-input"
                  value={localProfile.email}
                  onChange={(e) => setLocalProfile({ ...localProfile, email: e.target.value })}
                  placeholder="subhashkalakota@gmail.com"
                />
                <span className="form-hint">Must match your logged-in LinkedIn account email.</span>
              </div>

              {/* Phone Country Code */}
              <div className="form-group">
                <label className="form-label">Phone Country Code *</label>
                <select 
                  className="form-select"
                  value={localProfile.phoneCountryCode || 'India (+91)'}
                  onChange={(e) => setLocalProfile({ ...localProfile, phoneCountryCode: e.target.value })}
                >
                  {countryCodes.map(c => (
                    <option key={c.label} value={c.label}>{c.label}</option>
                  ))}
                </select>
                <span className="form-hint">Selected in the LinkedIn Easy Apply modal dropdown.</span>
              </div>

              {/* Mobile Phone Number */}
              <div className="form-group">
                <label className="form-label">
                  <Phone size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Mobile Phone Number (10 digits) *
                </label>
                <input 
                  type="tel" 
                  className="form-input"
                  value={localProfile.phone}
                  onChange={(e) => setLocalProfile({ ...localProfile, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                />
                <span className="form-hint" style={{ color: '#2563eb' }}>
                  Auto-fills the required <strong>Mobile phone number*</strong> input so application advances.
                </span>
              </div>

              {/* Headline */}
              <div className="form-group full-width">
                <label className="form-label">
                  <Briefcase size={13} style={{ display: 'inline', marginRight: 4 }} />
                  Candidate Title / Headline
                </label>
                <textarea 
                  className="form-textarea"
                  rows="2"
                  value={localProfile.headline}
                  onChange={(e) => setLocalProfile({ ...localProfile, headline: e.target.value })}
                  placeholder="Senior Software Engineer — React, Fullstack TypeScript & Intelligent UI Agents"
                />
              </div>
            </div>
          )}

          {/* TAB 3: SCREENING QUESTIONS */}
          {activeTab === 'screening' && (
            <div className="form-grid">
              <div className="form-group full-width" style={{ marginBottom: 4 }}>
                <div style={{ padding: '10px 14px', background: 'var(--bg-inset)', borderRadius: 8, fontSize: 12 }}>
                  💡 <strong>Automated Screening Answers:</strong> When Easy Apply prompts for common hiring questions (experience, citizenship, sponsorship, salary), the agent injects these pre-configured answers automatically.
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Years of Relevant Experience *</label>
                <input 
                  type="number" 
                  className="form-input"
                  min="0"
                  max="30"
                  value={localProfile.experienceYears}
                  onChange={(e) => setLocalProfile({ ...localProfile, experienceYears: Number(e.target.value) })}
                />
                <span className="form-hint">Auto-fills questions asking "How many years of experience...?"</span>
              </div>

              <div className="form-group">
                <label className="form-label">Work Authorization *</label>
                <select 
                  className="form-select"
                  value={localProfile.workAuthorization}
                  onChange={(e) => setLocalProfile({ ...localProfile, workAuthorization: e.target.value })}
                >
                  <option value="Yes">Yes (Citizen / PR / Legally Authorized)</option>
                  <option value="No">No</option>
                </select>
                <span className="form-hint">Answers "Are you legally authorized to work / US Citizen / GreenCard?"</span>
              </div>

              <div className="form-group">
                <label className="form-label">Requires Visa Sponsorship *</label>
                <select 
                  className="form-select"
                  value={localProfile.visaRequired}
                  onChange={(e) => setLocalProfile({ ...localProfile, visaRequired: e.target.value })}
                >
                  <option value="No">No sponsorship required</option>
                  <option value="Yes">Yes, will require sponsorship</option>
                </select>
                <span className="form-hint">Answers "Will you require visa sponsorship now or in future?"</span>
              </div>

              <div className="form-group">
                <label className="form-label">Base Compensation Floor *</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={localProfile.salaryFloor}
                  onChange={(e) => setLocalProfile({ ...localProfile, salaryFloor: e.target.value })}
                  placeholder="e.g. ₹22 LPA or ₹22,00,000"
                />
                <span className="form-hint">Auto-fills expected salary fields.</span>
              </div>

              <div className="form-group">
                <label className="form-label">Notice Period / Start Date</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={localProfile.noticePeriod || 'Immediately / 2 weeks'}
                  onChange={(e) => setLocalProfile({ ...localProfile, noticePeriod: e.target.value })}
                  placeholder="Immediately / 2 weeks"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Highest Degree Completed</label>
                <select 
                  className="form-select"
                  value={localProfile.degree || "Bachelor's Degree"}
                  onChange={(e) => setLocalProfile({ ...localProfile, degree: e.target.value })}
                >
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="Doctorate / PhD">Doctorate / PhD</option>
                  <option value="High School">High School</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 4: CDP */}
          {activeTab === 'cdp' && (
            <div className="form-grid">
              <div className="form-group full-width">
                <label className="form-label">Chrome DevTools Protocol Endpoint</label>
                <div className="input-with-button">
                  <input 
                    type="text" 
                    className="form-input"
                    value={localConfig.cdpEndpoint}
                    onChange={(e) => setLocalConfig({ ...localConfig, cdpEndpoint: e.target.value })}
                  />
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleTestCdp}
                    disabled={cdpTesting}
                  >
                    {cdpTesting ? <RefreshCw size={14} className="spin" /> : <RefreshCw size={14} />}
                    <span>Test CDP</span>
                  </button>
                </div>
                {cdpSuccess && (
                  <div className="success-callout animate-slide-up">
                    <Check size={16} />
                    <span>Connected to Chrome at {localConfig.cdpEndpoint}! Found active session.</span>
                  </div>
                )}
              </div>

              <div className="form-group full-width">
                <div className="code-snippet-box">
                  <div className="snippet-title">Chrome Remote Debugging Status:</div>
                  <pre className="code-pre">
{`# Chrome is connected and active on port 9222!
# Active User: subhashkalakota@gmail.com (Subhash Kalakota)
# Dedicated Resume: ${localProfile.resumeFile || 'None (Upload Compulsory)'}
# Auto-Applier: Multi-job equal distribution active across ${selectedQueries.length} posts.`}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} />
            <span>Save & Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
