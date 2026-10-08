import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Save,
  Trash2,
  ExternalLink,
  Sparkles,
  Search,
  Check,
  Plus,
  X,
  Globe,
  Code2,
  Link2,
  ShieldCheck,
  Zap,
  Sliders,
  IndianRupee,
  GraduationCap,
  Clock,
  ChevronDown
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';

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

  // Specialized Engineering Roles
  { title: "Software Engineer (Frontend)", category: "Frontend", popular: true },
  { title: "Software Engineer (Backend)", category: "Backend", popular: false },
  { title: "Software Engineer (Full Stack)", category: "Full Stack", popular: false },
  { title: "Senior Backend Engineer", category: "Backend", popular: true },
  { title: "Senior Full Stack Engineer", category: "Full Stack", popular: true },
  { title: "Senior DevOps Engineer", category: "Cloud & DevOps", popular: false },
  { title: "Senior Machine Learning Engineer", category: "AI & ML", popular: false },
  { title: "Senior Data Engineer", category: "Data", popular: false },
  { title: "Senior Product Manager", category: "Product", popular: false },
  { title: "Senior QA Automation Engineer", category: "QA & Testing", popular: false },
  { title: "Security Engineer", category: "Security", popular: false },
  { title: "Systems Engineer", category: "Core Engineering", popular: false },
  { title: "Scrum Master / Agile Coach", category: "Management", popular: false },

  // Frontend & UI
  { title: "Frontend Developer (React/Next.js)", category: "Frontend", popular: true },
  { title: "Frontend Developer (Vue/Nuxt)", category: "Frontend", popular: false },
  { title: "Frontend Developer (Angular)", category: "Frontend", popular: false },
  { title: "UI Developer", category: "Frontend", popular: false },
  { title: "Design Systems Engineer", category: "Frontend", popular: false },

  // Full Stack
  { title: "Full Stack Developer (MERN)", category: "Full Stack", popular: false },
  { title: "Java Full Stack Developer", category: "Full Stack", popular: false },
  { title: "Python Full Stack Engineer", category: "Full Stack", popular: false },
  { title: "Lead Full Stack Engineer", category: "Full Stack", popular: false },

  // Backend
  { title: "Python Developer (Django/FastAPI)", category: "Backend", popular: true },
  { title: "Java Backend Engineer", category: "Backend", popular: false },
  { title: "Go / Golang Engineer", category: "Backend", popular: false },
  { title: "Node.js Backend Developer", category: "Backend", popular: false },
  { title: "Lead Backend Engineer", category: "Backend", popular: false },

  // AI & Data
  { title: "Generative AI Application Engineer", category: "AI & ML", popular: true },
  { title: "AI Research Scientist", category: "AI & ML", popular: false },
  { title: "MLOps Engineer", category: "AI & ML", popular: false },
  { title: "Big Data Engineer", category: "Data", popular: false },
  { title: "Data Analyst", category: "Data", popular: false },
  { title: "Database Administrator (DBA)", category: "Data", popular: false },

  // Cloud & Infra
  { title: "Cloud Architect", category: "Cloud & DevOps", popular: false },
  { title: "Kubernetes Platform Specialist", category: "Cloud & DevOps", popular: false },
  { title: "Infrastructure Engineer", category: "Cloud & DevOps", popular: false },
  { title: "AWS Solutions Architect", category: "Cloud & DevOps", popular: false },
  { title: "DevSecOps Engineer", category: "Security", popular: false },

  // Mobile
  { title: "iOS Developer (Swift)", category: "Mobile", popular: true },
  { title: "Android Developer (Kotlin)", category: "Mobile", popular: true },
  { title: "React Native Developer", category: "Mobile", popular: true },
  { title: "Flutter Developer", category: "Mobile", popular: false },
  { title: "Mobile Application Engineer", category: "Mobile", popular: false },

  // QA & Architecture
  { title: "Automation Test Engineer", category: "QA & Testing", popular: false },
  { title: "QA Engineer (Cypress / Playwright)", category: "QA & Testing", popular: false },
  { title: "Enterprise Architect", category: "Architecture", popular: false },
  { title: "Engineering Manager", category: "Management", popular: false },
];

const COUNTRY_CODES = [
  { label: 'India (+91)', code: '+91' },
  { label: 'United States (+1)', code: '+1' },
  { label: 'United Kingdom (+44)', code: '+44' },
  { label: 'Canada (+1)', code: '+1' },
  { label: 'Australia (+61)', code: '+61' },
  { label: 'Germany (+49)', code: '+49' },
  { label: 'Singapore (+65)', code: '+65' },
  { label: 'United Arab Emirates (+971)', code: '+971' },
];

export default function ProfilePage({
  profile = {},
  onSaveProfile,
  config = {},
  onSaveConfig,
  onBack,
  currentUser,
  onStartAgent
}) {
  // Local state initialized with current profile
  const [formData, setFormData] = useState({
    name: profile.name || currentUser?.user_metadata?.name || '',
    email: profile.email || currentUser?.email || '',
    phoneCountryCode: profile.phoneCountryCode || 'India (+91)',
    phone: profile.phone || '',
    location: profile.location || 'Hyderabad, Telangana / Remote',
    headline: profile.headline || 'Full Stack Engineer | React, Node.js & Distributed Systems',
    linkedinUrl: profile.linkedinUrl || '',
    githubUrl: profile.githubUrl || '',
    portfolioUrl: profile.portfolioUrl || '',
    resumeFile: profile.resumeFile || null,
    resumePath: profile.resumePath || null,
    resumeSize: profile.resumeSize || null,
    experienceYears: profile.experienceYears ?? 5,
    workAuthorization: profile.workAuthorization || 'Yes',
    visaRequired: profile.visaRequired || 'No',
    salaryFloor: profile.salaryFloor || '₹22,00,000 / year (22 LPA)',
    noticePeriod: profile.noticePeriod || 'Immediately / 2 weeks',
    degree: profile.degree || "Bachelor's Degree",
    relocation: profile.relocation || 'Remote only',
    autoSubmit: profile.autoSubmit ?? true,
  });

  // Target roles
  const initialQueries = Array.isArray(config.searchQueries) && config.searchQueries.length > 0
    ? config.searchQueries
    : config.searchQuery
      ? [config.searchQuery]
      : ['Senior Frontend Engineer', 'Full Stack Engineer (React/Node)'];

  const [selectedRoles, setSelectedRoles] = useState(initialQueries);
  const [targetLocation, setTargetLocation] = useState(config.location || 'Bengaluru, Karnataka (Remote / Hybrid)');
  const [experienceLevel, setExperienceLevel] = useState(config.experienceLevel || 'Mid-Senior level');
  const [maxApplications, setMaxApplications] = useState(config.maxApplications || 50);
  const [pacingDelaySec, setPacingDelaySec] = useState(config.pacingDelaySec || 6);

  // Resume upload states
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadMessage, setUploadMessage] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Role Catalog Filter States
  const [roleSearchInput, setRoleSearchInput] = useState('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [popularCategoryFilter, setPopularCategoryFilter] = useState('All Popular');
  const dropdownRef = useRef(null);

  // Save states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsRoleDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered role catalog
  const filteredCatalogRoles = useMemo(() => {
    const q = roleSearchInput.trim().toLowerCase();
    return TECH_ROLE_CATALOG.filter(role => {
      if (selectedCategory === 'Popular') {
        if (!role.popular) return false;
      } else if (selectedCategory !== 'All' && role.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      if (q.length === 1) {
        const titleLower = role.title.toLowerCase();
        const startsWithChar = titleLower.startsWith(q);
        const wordStartsWithChar = titleLower.split(/[\s\-_/]+/).some(w => w.startsWith(q));
        return startsWithChar || wordStartsWithChar;
      }
      return role.title.toLowerCase().includes(q) || role.category.toLowerCase().includes(q);
    });
  }, [roleSearchInput, selectedCategory]);

  const filteredPopularRoles = useMemo(() => {
    if (popularCategoryFilter === 'All Popular') {
      return TECH_ROLE_CATALOG.filter(r => r.popular);
    }
    return TECH_ROLE_CATALOG.filter(r => r.popular && r.category === popularCategoryFilter);
  }, [popularCategoryFilter]);

  // Readiness calculation
  const readiness = useMemo(() => {
    let score = 0;
    const checks = {
      resume: false,
      contact: false,
      screening: false,
      roles: false
    };

    // 1. Mandatory Resume (+35%)
    if (formData.resumeFile && formData.resumePath) {
      score += 35;
      checks.resume = true;
    }

    // 2. Contact details (+25%)
    if (
      formData.name.trim().length >= 2 &&
      formData.email.includes('@') &&
      formData.phone.trim().length >= 7
    ) {
      score += 25;
      checks.contact = true;
    }

    // 3. Screening defaults (+20%)
    if (
      formData.workAuthorization &&
      formData.visaRequired &&
      formData.experienceYears !== undefined &&
      formData.degree
    ) {
      score += 20;
      checks.screening = true;
    }

    // 4. Target roles (+20%)
    if (selectedRoles.length > 0) {
      score += 20;
      checks.roles = true;
    }

    return {
      score,
      isComplete: checks.resume && checks.contact && checks.screening && checks.roles,
      checks
    };
  }, [formData, selectedRoles]);

  // Handle resume file upload
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
          setFormData(prev => ({
            ...prev,
            resumeFile: data.fileName,
            resumePath: data.filePath,
            resumeSize: data.fileSize
          }));
          setUploadMessage({
            type: 'success',
            text: `✅ Dedicated resume attached: ${data.fileName} (${(data.fileSize / 1024).toFixed(1)} KB)`
          });
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
    setFormData(prev => ({
      ...prev,
      resumeFile: null,
      resumePath: null,
      resumeSize: null
    }));
    setUploadMessage({ type: 'error', text: 'Resume removed. You must upload a resume before applying.' });
  };

  // Role toggle
  const handleToggleRole = (roleTitle) => {
    let updated;
    if (selectedRoles.includes(roleTitle)) {
      if (selectedRoles.length === 1) return; // keep at least 1
      updated = selectedRoles.filter(r => r !== roleTitle);
    } else {
      updated = [...selectedRoles, roleTitle];
    }
    setSelectedRoles(updated);
  };

  const handleAddCustomRole = (customTitle) => {
    const trimmed = (customTitle || roleSearchInput).trim();
    if (trimmed && !selectedRoles.includes(trimmed)) {
      setSelectedRoles([...selectedRoles, trimmed]);
    }
    setRoleSearchInput('');
    setIsRoleDropdownOpen(false);
  };

  // Save profile & config
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);

    const updatedProfile = {
      ...formData,
      targetRole: selectedRoles[0] || 'Software Engineer',
    };

    const updatedConfig = {
      ...config,
      searchQueries: selectedRoles,
      searchQuery: selectedRoles[0] || 'Software Engineer',
      location: targetLocation,
      experienceLevel,
      maxApplications,
      pacingDelaySec
    };

    try {
      // 1. Invoke props callbacks
      onSaveProfile && onSaveProfile(updatedProfile);
      onSaveConfig && onSaveConfig(updatedConfig);

      // 2. Persist to localStorage
      try {
        localStorage.setItem('job_agent_profile', JSON.stringify(updatedProfile));
        if (currentUser?.id) {
          localStorage.setItem(`job_agent_profile_${currentUser.id}`, JSON.stringify(updatedProfile));
        }
        localStorage.setItem('job_agent_config', JSON.stringify(updatedConfig));
      } catch (e) {}

      // 3. Sync to server backend
      await fetch('http://localhost:3001/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: updatedConfig, profile: updatedProfile })
      }).catch(() => {});

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = ['All', 'Popular', 'Frontend', 'Full Stack', 'Backend', 'Core Engineering', 'AI & ML', 'Cloud & DevOps', 'Data', 'Mobile'];

  return (
    <div className="profile-page-container animate-fade-in">
      {/* Top Navigation & Breadcrumb */}
      <div className="profile-nav-bar">
        <button className="btn btn-ghost btn-back-dashboard" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </button>

        <div className="profile-top-actions">
          <button 
            className={`btn btn-primary ${saveSuccess ? 'btn-saved' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="spinner-icon"></span>
                <span>Saving Profile...</span>
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle2 size={16} />
                <span>Profile Saved &amp; Synced!</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span>Save Profile Changes</span>
              </>
            )}
          </button>

          {readiness.isComplete && onStartAgent && (
            <button 
              className="btn btn-success btn-start-now"
              onClick={() => {
                handleSave();
                onStartAgent();
              }}
            >
              <Zap size={16} />
              <span>Start Auto-Apply Now</span>
            </button>
          )}
        </div>
      </div>

      {/* Hero Header Card */}
      <div className="profile-hero-card">
        <div className="profile-hero-left">
          <div className="profile-penguin-avatar">
            <PenguinAvatar mode={readiness.isComplete ? 'idle' : 'loading'} size={85} />
          </div>
          <div className="profile-hero-text">
            <div className="profile-title-badge-row">
              <h1 className="profile-main-title">Candidate Profile &amp; Easy Apply Hub</h1>
              <span className={`readiness-pill ${readiness.isComplete ? 'ready' : 'incomplete'}`}>
                {readiness.isComplete ? '✨ Ready for Auto-Apply' : '⚠️ Profile Setup Required'}
              </span>
            </div>
            <p className="profile-hero-subtitle">
              Penguin AI uses these credentials and your uploaded resume to autonomously answer Easy Apply questions,
              select matching options, and submit verified applications to LinkedIn.
            </p>
          </div>
        </div>

        {/* Readiness Meter */}
        <div className="profile-readiness-box">
          <div className="readiness-header">
            <span className="readiness-title">Profile Readiness</span>
            <span className="readiness-pct">{readiness.score}%</span>
          </div>
          <div className="readiness-meter-bar">
            <div 
              className={`readiness-meter-fill ${readiness.score === 100 ? 'full' : readiness.score >= 60 ? 'mid' : 'low'}`}
              style={{ width: `${readiness.score}%` }}
            />
          </div>
          <div className="readiness-checklist">
            <div className={`check-item ${readiness.checks.resume ? 'done' : 'missing'}`}>
              {readiness.checks.resume ? <Check size={12} /> : <X size={12} />}
              <span>Compulsory Resume</span>
            </div>
            <div className={`check-item ${readiness.checks.contact ? 'done' : 'missing'}`}>
              {readiness.checks.contact ? <Check size={12} /> : <X size={12} />}
              <span>Contact Info</span>
            </div>
            <div className={`check-item ${readiness.checks.screening ? 'done' : 'missing'}`}>
              {readiness.checks.screening ? <Check size={12} /> : <X size={12} />}
              <span>Screening Q&amp;A</span>
            </div>
            <div className={`check-item ${readiness.checks.roles ? 'done' : 'missing'}`}>
              {readiness.checks.roles ? <Check size={12} /> : <X size={12} />}
              <span>Target Roles</span>
            </div>
          </div>
        </div>
      </div>

      {/* Compulsory Missing Banner */}
      {!readiness.checks.resume && (
        <div className="profile-alert-banner alert-danger animate-slide-up">
          <AlertCircle size={20} className="alert-icon" />
          <div className="alert-text-group">
            <strong>Mandatory Resume Required!</strong>
            <span>You cannot start the autonomous agent or apply to jobs without uploading a dedicated resume. Please upload your PDF or DOCX file below.</span>
          </div>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Upload Resume Now
          </button>
        </div>
      )}

      {/* Main Form Layout */}
      <div className="profile-sections-grid">

        {/* SECTION 1: COMPULSORY RESUME UPLOAD */}
        <section className={`profile-card resume-card ${!formData.resumeFile ? 'highlight-missing' : ''}`}>
          <div className="card-header">
            <div className="card-title-group">
              <FileText size={18} className="text-accent" />
              <div>
                <h2 className="card-title">Dedicated Resume Document (Compulsory) *</h2>
                <p className="card-subtitle">Required for all LinkedIn Easy Apply job submissions. Never uses mock files.</p>
              </div>
            </div>
            {formData.resumeFile ? (
              <span className="badge-status-green">
                <CheckCircle2 size={13} /> Attached &amp; Verified
              </span>
            ) : (
              <span className="badge-status-red">
                <AlertCircle size={13} /> Compulsory Upload
              </span>
            )}
          </div>

          <div className="card-body">
            {/* Drag & Drop Upload Zone */}
            <div 
              className={`resume-dropzone ${isDragOver ? 'drag-over' : ''} ${formData.resumeFile ? 'has-file' : 'empty'}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                style={{ display: 'none' }} 
              />
              <div className="dropzone-icon-box">
                {uploadingResume ? (
                  <div className="spinner-icon lg" />
                ) : (
                  <Upload size={32} className="text-accent" />
                )}
              </div>
              <div className="dropzone-text">
                <strong className="dropzone-title">
                  {uploadingResume 
                    ? 'Uploading resume to agent server...' 
                    : formData.resumeFile 
                      ? 'Click or drag to replace your resume' 
                      : 'Click to upload your resume or drag & drop file here'}
                </strong>
                <span className="dropzone-desc">
                  Supported formats: PDF, DOCX, DOC (Up to 10MB). Stored securely and attached directly by Playwright.
                </span>
              </div>
            </div>

            {/* Upload Message Banner */}
            {uploadMessage && (
              <div className={`upload-feedback-banner ${uploadMessage.type}`}>
                {uploadMessage.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                <span>{uploadMessage.text}</span>
              </div>
            )}

            {/* Current File Metadata Box */}
            {formData.resumeFile ? (
              <div className="current-resume-meta-card">
                <div className="file-info-left">
                  <div className="file-badge-icon">
                    <FileText size={22} className="text-accent" />
                  </div>
                  <div>
                    <div className="file-name-row">
                      <span className="file-name">{formData.resumeFile}</span>
                      <span className="file-tag">Active for Easy Apply</span>
                    </div>
                    {formData.resumeSize && (
                      <span className="file-size">{(formData.resumeSize / 1024).toFixed(1)} KB</span>
                    )}
                    {formData.resumePath && (
                      <div className="file-path-hint">
                        Disk Path: <code>{formData.resumePath}</code>
                      </div>
                    )}
                  </div>
                </div>
                <div className="file-actions">
                  <button 
                    type="button" 
                    className="btn btn-outline btn-sm"
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Replace
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-ghost btn-sm text-danger"
                    onClick={(e) => { e.stopPropagation(); handleRemoveResume(); }}
                  >
                    <Trash2 size={14} />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-resume-alert">
                <AlertTriangle size={16} />
                <span>No resume uploaded yet. You cannot start the agent without uploading your resume.</span>
              </div>
            )}
          </div>
        </section>

        {/* SECTION 2: CONTACT & IDENTITY */}
        <section className="profile-card">
          <div className="card-header">
            <div className="card-title-group">
              <User size={18} className="text-accent" />
              <div>
                <h2 className="card-title">Contact &amp; Identification *</h2>
                <p className="card-subtitle">LinkedIn Easy Apply injects these details into Step 1 modal forms.</p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">
                  <User size={13} /> Full Name *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Subhash Kalakota"
                  required
                />
                <span className="form-hint">Used in contact review step of Easy Apply.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Mail size={13} /> LinkedIn Account Email *
                </label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="e.g. subhashkalakota@gmail.com"
                  required
                />
                <span className="form-hint">Must match your logged-in LinkedIn profile email.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Globe size={13} /> Phone Country Code *
                </label>
                <select 
                  className="form-select"
                  value={formData.phoneCountryCode}
                  onChange={e => setFormData({ ...formData, phoneCountryCode: e.target.value })}
                >
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code + c.label} value={c.label}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Phone size={13} /> Mobile Phone Number *
                </label>
                <input 
                  type="tel" 
                  className="form-input" 
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  required
                />
                <span className="form-hint">Auto-filled in Easy Apply phone number fields.</span>
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <MapPin size={13} /> Current Location (City, State / Country) *
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Hyderabad, Telangana or Bengaluru, Karnataka"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <Briefcase size={13} /> Professional Headline / Title
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.headline}
                  onChange={e => setFormData({ ...formData, headline: e.target.value })}
                  placeholder="e.g. Senior Software Engineer | React, Node.js &amp; AI Agents"
                />
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: TARGET JOB ROLES & PREFERENCES */}
        <section className="profile-card">
          <div className="card-header">
            <div className="card-title-group">
              <Briefcase size={18} className="text-accent" />
              <div>
                <h2 className="card-title">Target Job Roles &amp; Equal Quota Engine *</h2>
                <p className="card-subtitle">Select multiple job titles. Penguin will distribute applications equally across all selected posts.</p>
              </div>
            </div>
            <span className="badge-count-pill">{selectedRoles.length} Roles Selected</span>
          </div>

          <div className="card-body">
            {/* Active Selected Roles */}
            <div className="selected-roles-container">
              <div className="selected-roles-label">
                <span>Active Target Posts ({selectedRoles.length})</span>
                <span className="roles-hint">Applications distributed equally</span>
              </div>
              <div className="selected-roles-chips">
                {selectedRoles.map((roleTitle, idx) => {
                  const share = Math.floor(maxApplications / selectedRoles.length);
                  return (
                    <div key={roleTitle} className="role-tag-chip">
                      <span className="role-tag-num">#{idx + 1}</span>
                      <span className="role-tag-title">{roleTitle}</span>
                      <span className="role-tag-quota">~{share} jobs</span>
                      {selectedRoles.length > 1 && (
                        <button 
                          type="button" 
                          className="role-tag-remove" 
                          onClick={() => handleToggleRole(roleTitle)}
                          title={`Remove ${roleTitle}`}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Catalog Search & Dropdown */}
            <div className="role-search-box-wrapper" ref={dropdownRef}>
              <label className="form-label">
                <span>Select Target Roles from Catalog (type initial letter, e.g. 'S')</span>
                <span className="catalog-count">{filteredCatalogRoles.length} standard roles available</span>
              </label>
              <div className="search-input-field">
                <Search size={15} className="search-icon" />
                <input 
                  type="text"
                  className="form-input search-catalog-input"
                  value={roleSearchInput}
                  onChange={e => {
                    setRoleSearchInput(e.target.value);
                    setIsRoleDropdownOpen(true);
                  }}
                  onFocus={() => setIsRoleDropdownOpen(true)}
                  placeholder="Type letter (e.g. 'S') to filter roles starting with S, or click to browse..."
                />
                {roleSearchInput ? (
                  <button type="button" className="btn-clear-search" onClick={() => setRoleSearchInput('')}>
                    <X size={14} />
                  </button>
                ) : (
                  <ChevronDown size={14} className="dropdown-arrow" />
                )}
              </div>

              {/* Dropdown Popover */}
              {isRoleDropdownOpen && (
                <div className="role-catalog-popover animate-slide-up">
                  <div className="popover-header">
                    <div className="popover-title-row">
                      <span className="popover-heading">
                        {roleSearchInput.trim().length === 1 
                          ? `Roles Starting With "${roleSearchInput.toUpperCase()}" (${filteredCatalogRoles.length} matches)`
                          : `Standard Engineering Roles (${filteredCatalogRoles.length})`}
                      </span>
                      <button 
                        type="button" 
                        className="btn-done" 
                        onClick={() => setIsRoleDropdownOpen(false)}
                      >
                        Done ✕
                      </button>
                    </div>

                    {/* Category tabs */}
                    <div className="popover-tabs-row">
                      {categories.map(cat => (
                        <button 
                          key={cat}
                          type="button" 
                          className={`popover-tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                          onClick={() => setSelectedCategory(cat)}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="popover-list">
                    {filteredCatalogRoles.length === 0 ? (
                      <div className="popover-empty">
                        <p>No standard roles found matching "{roleSearchInput}".</p>
                        <button 
                          type="button" 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleAddCustomRole(roleSearchInput)}
                        >
                          Add "{roleSearchInput}" as Custom Target Role
                        </button>
                      </div>
                    ) : (
                      filteredCatalogRoles.map(role => {
                        const isSelected = selectedRoles.includes(role.title);
                        return (
                          <div 
                            key={role.title}
                            className={`catalog-item-row ${isSelected ? 'selected' : ''}`}
                            onClick={() => handleToggleRole(role.title)}
                          >
                            <div className="item-main">
                              <span className="item-cat-badge">{role.category}</span>
                              <span className="item-title">{role.title}</span>
                            </div>
                            <span className="item-status">
                              {isSelected ? (
                                <>
                                  <Check size={13} className="text-success" />
                                  <span className="text-success">Selected</span>
                                </>
                              ) : (
                                <>
                                  <Plus size={13} />
                                  <span>Select</span>
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

            {/* Popular Roles Quick-Pills */}
            <div className="popular-roles-wrapper">
              <div className="popular-header-row">
                <div className="popular-title">
                  <Sparkles size={14} className="text-accent" />
                  <span>Popular Tech Roles (Click to Toggle)</span>
                </div>
                {/* Popular category filters */}
                <div className="popular-cat-pills">
                  {['All Popular', 'Frontend', 'Full Stack', 'Backend', 'AI & ML', 'Cloud & DevOps'].map(cat => (
                    <button 
                      key={cat}
                      type="button"
                      className={`pop-cat-btn ${popularCategoryFilter === cat ? 'active' : ''}`}
                      onClick={() => setPopularCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="popular-chips-grid">
                {filteredPopularRoles.map(role => {
                  const isSelected = selectedRoles.includes(role.title);
                  return (
                    <button 
                      key={role.title}
                      type="button" 
                      className={`popular-role-pill ${isSelected ? 'active' : ''}`}
                      onClick={() => handleToggleRole(role.title)}
                    >
                      {isSelected ? <Check size={13} /> : <Plus size={13} />}
                      <span>{role.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Target Location & Level */}
            <div className="form-grid-2" style={{ marginTop: '16px' }}>
              <div className="form-group">
                <label className="form-label">Target Search Location</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={targetLocation}
                  onChange={e => setTargetLocation(e.target.value)}
                  placeholder="e.g. Bengaluru, Hyderabad, Pune, Remote India"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Experience Level Filter</label>
                <select 
                  className="form-select"
                  value={experienceLevel}
                  onChange={e => setExperienceLevel(e.target.value)}
                >
                  <option value="Mid-Senior level">Mid-Senior level</option>
                  <option value="Senior">Senior</option>
                  <option value="Lead / Staff">Lead / Staff</option>
                  <option value="Entry level">Entry level</option>
                  <option value="All levels">All levels</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: EASY APPLY SCREENING Q&A DEFAULTS */}
        <section className="profile-card">
          <div className="card-header">
            <div className="card-title-group">
              <ShieldCheck size={18} className="text-accent" />
              <div>
                <h2 className="card-title">Easy Apply Screening Q&amp;A Defaults *</h2>
                <p className="card-subtitle">Pre-configured answers to common questions asked in LinkedIn modals.</p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">
                  <Clock size={13} /> Years of Professional Experience *
                </label>
                <input 
                  type="number" 
                  min="0" 
                  max="35" 
                  className="form-input" 
                  value={formData.experienceYears}
                  onChange={e => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                  required
                />
                <span className="form-hint">Used for experience question inputs (e.g. "How many years of React?").</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <GraduationCap size={13} /> Highest Degree Completed *
                </label>
                <select 
                  className="form-select"
                  value={formData.degree}
                  onChange={e => setFormData({ ...formData, degree: e.target.value })}
                >
                  <option value="Bachelor's Degree">Bachelor's Degree</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="Doctorate / PhD">Doctorate / PhD</option>
                  <option value="Associate Degree">Associate Degree</option>
                  <option value="High School">High School</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Legally Authorized to Work in Target Country? *
                </label>
                <div className="radio-toggle-group">
                  <label className={`radio-pill ${formData.workAuthorization === 'Yes' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="workAuth" 
                      value="Yes" 
                      checked={formData.workAuthorization === 'Yes'}
                      onChange={() => setFormData({ ...formData, workAuthorization: 'Yes' })}
                    />
                    <span>Yes (Authorized)</span>
                  </label>
                  <label className={`radio-pill ${formData.workAuthorization === 'No' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="workAuth" 
                      value="No" 
                      checked={formData.workAuthorization === 'No'}
                      onChange={() => setFormData({ ...formData, workAuthorization: 'No' })}
                    />
                    <span>No</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Require Visa Sponsorship Now or in Future? *
                </label>
                <div className="radio-toggle-group">
                  <label className={`radio-pill ${formData.visaRequired === 'No' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="visaReq" 
                      value="No" 
                      checked={formData.visaRequired === 'No'}
                      onChange={() => setFormData({ ...formData, visaRequired: 'No' })}
                    />
                    <span>No (No Sponsorship Needed)</span>
                  </label>
                  <label className={`radio-pill ${formData.visaRequired === 'Yes' ? 'selected' : ''}`}>
                    <input 
                      type="radio" 
                      name="visaReq" 
                      value="Yes" 
                      checked={formData.visaRequired === 'Yes'}
                      onChange={() => setFormData({ ...formData, visaRequired: 'Yes' })}
                    />
                    <span>Yes (Need Sponsorship)</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <IndianRupee size={13} /> Minimum Annual Compensation Floor
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={formData.salaryFloor}
                  onChange={e => setFormData({ ...formData, salaryFloor: e.target.value })}
                  placeholder="e.g. ₹22 LPA or ₹22,00,000"
                />
                <span className="form-hint">Injected into expected compensation / salary range questions.</span>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Clock size={13} /> Notice Period / Start Availability
                </label>
                <select 
                  className="form-select"
                  value={formData.noticePeriod}
                  onChange={e => setFormData({ ...formData, noticePeriod: e.target.value })}
                >
                  <option value="Immediately / 2 weeks">Immediately / 2 weeks</option>
                  <option value="1 month">1 month</option>
                  <option value="2 months">2 months</option>
                  <option value="Negotiable">Negotiable</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">Relocation Preference</label>
                <select 
                  className="form-select"
                  value={formData.relocation}
                  onChange={e => setFormData({ ...formData, relocation: e.target.value })}
                >
                  <option value="Remote only">Remote only (Will not relocate)</option>
                  <option value="Willing to relocate with assistance">Willing to relocate with assistance</option>
                  <option value="Willing to relocate independently">Willing to relocate independently</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: PROFESSIONAL LINKS & AUTOMATION */}
        <section className="profile-card">
          <div className="card-header">
            <div className="card-title-group">
              <Globe size={18} className="text-accent" />
              <div>
                <h2 className="card-title">Professional Links &amp; Autonomous Controls</h2>
                <p className="card-subtitle">Links auto-filled into website / portfolio inputs.</p>
              </div>
            </div>
          </div>

          <div className="card-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">
                  <Link2 size={13} /> LinkedIn Profile URL
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={formData.linkedinUrl}
                  onChange={e => setFormData({ ...formData, linkedinUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Code2 size={13} /> GitHub / Portfolio URL
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={formData.githubUrl}
                  onChange={e => setFormData({ ...formData, githubUrl: e.target.value })}
                  placeholder="https://github.com/yourhandle"
                />
              </div>

              <div className="form-group full-width">
                <label className="form-label">
                  <Globe size={13} /> Personal Website / Portfolio
                </label>
                <input 
                  type="url" 
                  className="form-input" 
                  value={formData.portfolioUrl}
                  onChange={e => setFormData({ ...formData, portfolioUrl: e.target.value })}
                  placeholder="https://yourdomain.dev"
                />
              </div>
            </div>

            {/* Automation toggle */}
            <div className="auto-submit-box">
              <div className="auto-submit-info">
                <Zap size={18} className="text-accent" />
                <div>
                  <strong>100% Autonomous Auto-Apply Mode</strong>
                  <p>When enabled, Penguin clicks Easy Apply, attaches your resume, fills all inputs, and clicks 'Submit Application' without prompting for confirmation.</p>
                </div>
              </div>
              <label className="toggle-switch">
                <input 
                  type="checkbox" 
                  checked={formData.autoSubmit}
                  onChange={e => setFormData({ ...formData, autoSubmit: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </section>

      </div>

      {/* Sticky Bottom Action Dock */}
      <div className="profile-bottom-dock">
        <div className="dock-left">
          <div className="readiness-mini-pill">
            <span className="dock-label">Profile Readiness:</span>
            <strong className={readiness.isComplete ? 'text-success' : 'text-danger'}>
              {readiness.score}% {readiness.isComplete ? '• Ready' : '• Incomplete'}
            </strong>
          </div>
          {!readiness.isComplete && (
            <span className="dock-missing-hint">
              {!readiness.checks.resume && '⚠️ Resume upload required before applying!'}
              {readiness.checks.resume && !readiness.checks.contact && '⚠️ Name, email, and phone required!'}
            </span>
          )}
        </div>

        <div className="dock-right">
          <button 
            type="button" 
            className="btn btn-ghost"
            onClick={onBack}
          >
            Cancel
          </button>

          <button 
            type="button" 
            className={`btn btn-primary ${saveSuccess ? 'btn-saved' : ''}`}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : saveSuccess ? 'Saved to Cloud ✓' : 'Save Profile'}
          </button>

          {readiness.isComplete && onStartAgent && (
            <button 
              type="button" 
              className="btn btn-success"
              onClick={() => {
                handleSave();
                onStartAgent();
              }}
            >
              <Zap size={15} />
              <span>Apply to Jobs Now 🐧</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
