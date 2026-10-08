import React from 'react';
import { 
  FileText, 
  UserCheck, 
  Sparkles, 
  ArrowRight, 
  X,
  Briefcase,
  ShieldCheck
} from 'lucide-react';
import PenguinAvatar from './PenguinAvatar';

export default function ProfileSetupModal({ isOpen, onClose, onOpenProfilePage, currentUser }) {
  if (!isOpen) return null;

  const displayName = currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Subhash';

  return (
    <div className="modal-backdrop animate-fade-in" style={{ zIndex: 1400 }} onClick={onClose}>
      <div 
        className="modal-container profile-setup-prompt-card animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="profile-setup-header">
          <button 
            type="button" 
            className="icon-btn modal-close-btn" 
            onClick={onClose}
            title="Dismiss"
          >
            <X size={18} />
          </button>

          <div className="profile-setup-avatar-wrap">
            <PenguinAvatar mode="loading" size={85} />
          </div>

          <div className="profile-setup-badge">
            <Sparkles size={12} />
            <span>Profile Setup Required</span>
          </div>

          <h2 className="profile-setup-title">
            Welcome {displayName}! Let's Set Up Your Profile 🐧
          </h2>
          <p className="profile-setup-subtitle">
            Penguin AI cannot apply to jobs without your dedicated resume and contact details. Complete your profile to activate autonomous Easy Apply.
          </p>
        </div>

        {/* Body Checklist */}
        <div className="profile-setup-body">
          <div className="profile-setup-list">
            {/* 1. Compulsory Resume */}
            <div className="setup-checklist-item compulsory">
              <div className="setup-item-icon-box compulsory-icon">
                <FileText size={18} />
              </div>
              <div className="setup-item-text">
                <div className="setup-item-title compulsory-text">
                  Upload Dedicated Resume (Compulsory) *
                </div>
                <div className="setup-item-desc">
                  PDF or DOCX file attached to all LinkedIn Easy Apply submissions.
                </div>
              </div>
            </div>

            {/* 2. Contact details */}
            <div className="setup-checklist-item standard">
              <div className="setup-item-icon-box contact-icon">
                <UserCheck size={18} />
              </div>
              <div className="setup-item-text">
                <div className="setup-item-title">
                  Contact Info &amp; Phone Number
                </div>
                <div className="setup-item-desc">
                  Phone country code, 10-digit number &amp; LinkedIn account email.
                </div>
              </div>
            </div>

            {/* 3. Target job roles */}
            <div className="setup-checklist-item standard">
              <div className="setup-item-icon-box roles-icon">
                <Briefcase size={18} />
              </div>
              <div className="setup-item-text">
                <div className="setup-item-title">
                  Target Job Titles &amp; Distribution
                </div>
                <div className="setup-item-desc">
                  Select multiple roles for equal application volume across posts.
                </div>
              </div>
            </div>

            {/* 4. Screening defaults */}
            <div className="setup-checklist-item standard">
              <div className="setup-item-icon-box screening-icon">
                <ShieldCheck size={18} />
              </div>
              <div className="setup-item-text">
                <div className="setup-item-title">
                  Screening Q&amp;A Defaults
                </div>
                <div className="setup-item-desc">
                  Work authorization, visa status, notice period, and years of experience.
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="profile-setup-actions">
            <button 
              type="button" 
              className="btn btn-primary btn-setup-action"
              onClick={() => {
                onClose();
                onOpenProfilePage();
              }}
            >
              <span>Create / Complete Profile Now 🐧</span>
              <ArrowRight size={16} />
            </button>

            <button 
              type="button" 
              className="btn-setup-dismiss"
              onClick={onClose}
            >
              I'll complete it later (Cannot apply to jobs yet)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
