import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const TOTAL_STEPS = 4;

// ─── SVG Icon helpers ──────────────────────────────────────────────────────────
const Icon = ({ children, ...props }: React.SVGProps<SVGSVGElement> & { children: React.ReactNode }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}>{children}</svg>
);

const icons = {
  clock:      <Icon><circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" /></Icon>,
  clipboard:  <Icon><path d="M10 2H6a1 1 0 00-1 1v1h6V3a1 1 0 00-1-1z" /><rect x="3" y="4" width="10" height="10" rx="1" /><path d="M6 8h4M6 10.5h3" /></Icon>,
  barChart:   <Icon><path d="M3 13v-4M7 13V6M11 13V4" /><path d="M1 13h14" /></Icon>,
  users:      <Icon><circle cx="6" cy="5" r="2.5" /><path d="M1.5 14c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" /><circle cx="12" cy="5.5" r="1.8" /><path d="M12.5 10c1.5.3 2.5 1.3 2.5 3" /></Icon>,
  checkSquare:<Icon><rect x="2" y="2" width="12" height="12" rx="2" /><path d="M5.5 8l2 2 3.5-3.5" /></Icon>,
  trending:   <Icon><path d="M2 12l4-4 3 3 5-5" /><path d="M10 6h4v4" /></Icon>,
  folder:     <Icon><path d="M2 4.5A1.5 1.5 0 013.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0114 6v5.5A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-7z" /></Icon>,
  bell:       <Icon><path d="M8 14c.8 0 1.5-.7 1.5-1.5h-3c0 .8.7 1.5 1.5 1.5z" /><path d="M12 9V7a4 4 0 10-8 0v2l-1.5 2.5h11L12 9z" /></Icon>,
  user:       <Icon><circle cx="8" cy="5.5" r="3" /><path d="M2.5 14c0-2.5 2.5-4 5.5-4s5.5 1.5 5.5 4" /></Icon>,
  send:       <Icon><path d="M14 2L2 8.5l4 2L14 2zM6 10.5V14l2.5-2.5" /></Icon>,
  building:   <Icon><rect x="3" y="2" width="10" height="12" rx="1" /><path d="M6 5h1M9 5h1M6 8h1M9 8h1M6 11h4" /></Icon>,
  settings:   <Icon><circle cx="8" cy="8" r="2" /><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.75 3.75l1.1 1.1M11.15 11.15l1.1 1.1M12.25 3.75l-1.1 1.1M4.85 11.15l-1.1 1.1" /></Icon>,
  shield:     <Icon><path d="M8 1.5L2.5 4v4c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V4L8 1.5z" /><path d="M6 8l1.5 1.5L10 7" /></Icon>,
};

// ─── Role capabilities mapping ─────────────────────────────────────────────────
const ROLE_CAPABILITIES: Record<string, { label: string; features: { icon: React.ReactNode; text: string }[] }> = {
  employee: {
    label: 'Employee',
    features: [
      { icon: icons.clock,      text: 'Log daily work hours against assigned projects' },
      { icon: icons.clipboard,  text: 'Submit weekly timesheets for manager review' },
      { icon: icons.barChart,   text: 'View your personal reports & utilization' },
      { icon: icons.users,      text: 'View fellow team members\' timesheets' },
    ],
  },
  manager: {
    label: 'Manager',
    features: [
      { icon: icons.checkSquare, text: 'Approve or reject team timesheets' },
      { icon: icons.trending,    text: 'Monitor team utilization and performance' },
      { icon: icons.folder,      text: 'Manage projects and task assignments' },
      { icon: icons.bell,        text: 'Send reminders to your direct reports' },
    ],
  },
  hr: {
    label: 'HR',
    features: [
      { icon: icons.user,        text: 'Manage employee directory and profiles' },
      { icon: icons.barChart,    text: 'View organization-wide reports' },
      { icon: icons.send,        text: 'Send bulk reminders across all teams' },
      { icon: icons.checkSquare, text: 'Review and process all timesheets' },
    ],
  },
  ceo: {
    label: 'CEO',
    features: [
      { icon: icons.barChart,    text: 'View executive dashboards and KPIs' },
      { icon: icons.building,    text: 'Monitor department-level utilization' },
      { icon: icons.checkSquare, text: 'Approve timesheets across the organization' },
      { icon: icons.trending,    text: 'Track resource allocation and costs' },
    ],
  },
  admin: {
    label: 'System Admin',
    features: [
      { icon: icons.settings,    text: 'Manage all users, roles, and permissions' },
      { icon: icons.folder,      text: 'Create and configure projects' },
      { icon: icons.barChart,    text: 'Access all reports and analytics' },
      { icon: icons.shield,      text: 'Manage invitations and security settings' },
    ],
  },
};

// ─── Navigation items for sidebar preview ──────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="5" height="5" rx="1" />
        <rect x="9" y="2" width="5" height="5" rx="1" />
        <rect x="2" y="9" width="5" height="5" rx="1" />
        <rect x="9" y="9" width="5" height="5" rx="1" />
      </svg>
    ),
  },
  {
    label: 'Work Logs',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="8" r="6" />
        <path d="M8 5v3l2 2" />
      </svg>
    ),
  },
  {
    label: 'Projects',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 4.5A1.5 1.5 0 013.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0114 6v5.5A1.5 1.5 0 0112.5 13h-9A1.5 1.5 0 012 11.5v-7z" />
      </svg>
    ),
  },
  {
    label: 'Approvals',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M9 2.5H4a1.5 1.5 0 00-1.5 1.5v8A1.5 1.5 0 004 13.5h8a1.5 1.5 0 001.5-1.5V7" />
        <path d="M6 8l2 2 4.5-4.5" />
      </svg>
    ),
  },
  {
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 13v-5M8 13V5M13 13v-3" />
      </svg>
    ),
  },
];

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const { currentUser, role } = useAppStore();

  const roleCaps = ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.employee;

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  const handleSkip = () => {
    onComplete();
  };

  // ─── Step 1: Welcome ─────────────────────────────────────────────────────────
  const renderWelcome = () => (
    <div className="onboarding__step" key="welcome">
      <div className="onboarding__welcome">
        <div className="onboarding__avatar-cluster">
          <div className="onboarding__avatar-bubble">
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="6" r="3" /><path d="M2 14c0-2.5 2.5-4 6-4s6 1.5 6 4" />
            </svg>
          </div>
          <div className="onboarding__avatar-bubble">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="6" r="3" /><path d="M2 14c0-2.5 2.5-4 6-4s6 1.5 6 4" />
            </svg>
          </div>
          <div className="onboarding__avatar-bubble">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="6" r="3" /><path d="M2 14c0-2.5 2.5-4 6-4s6 1.5 6 4" />
            </svg>
          </div>
          <div className="onboarding__avatar-bubble">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="8" cy="6" r="3" /><path d="M2 14c0-2.5 2.5-4 6-4s6 1.5 6 4" />
            </svg>
          </div>
        </div>
        <h1 className="onboarding__welcome-title">We're so glad you're here!</h1>
        <p className="onboarding__welcome-desc">
          Your workspace is ready. Let's walk you through a few things to help you get the most out of your timesheet experience.
        </p>
      </div>
    </div>
  );

  // ─── Step 2: Your Role ───────────────────────────────────────────────────────
  const renderRole = () => (
    <div className="onboarding__step" key="role">
      <div className="onboarding__role">
        {/* Sidebar Preview */}
        <div className="onboarding__role-sidebar">
          <div className="onboarding__role-sidebar-logo">
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M10 3L2 7l8 4 8-4-8-4zM2 11l8 4 8-4M2 15l8 4 8-4" />
            </svg>
            <span>eGlobe</span>
          </div>
          <ul className="onboarding__role-nav">
            {NAV_ITEMS.map((item, i) => (
              <li
                key={item.label}
                className={`onboarding__role-nav-item${i === 0 ? ' onboarding__role-nav-item--active' : ''}`}
              >
                {item.icon}
                {item.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Role Details */}
        <div className="onboarding__role-content">
          <h2 className="onboarding__role-title">Your Role & Profile</h2>
          <p className="onboarding__role-subtitle">Here's how your workspace is configured</p>

          <div className="onboarding__role-card">
            <div className="onboarding__role-card-label">Signed in as</div>
            <div className="onboarding__role-card-value">
              {currentUser.name}
              <span className="onboarding__role-badge">{roleCaps.label}</span>
            </div>
          </div>

          <div className="onboarding__role-card">
            <div className="onboarding__role-card-label">Department</div>
            <div className="onboarding__role-card-value" style={{ fontSize: 16 }}>
              {currentUser.department}
            </div>
          </div>

          <div className="onboarding__role-card" style={{ border: 'none', background: 'transparent', padding: '8px 0' }}>
            <div className="onboarding__role-card-label">What you can do</div>
            <div className="onboarding__role-features">
              {roleCaps.features.map((f) => (
                <div key={f.text} className="onboarding__role-feature">
                  <span className="onboarding__role-feature-icon">{f.icon}</span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Step 3: Feature Tour ────────────────────────────────────────────────────
  const renderTour = () => (
    <div className="onboarding__step" key="tour">
      <div className="onboarding__tour">
        <h2 className="onboarding__tour-title">Explore Key Features</h2>
        <p className="onboarding__tour-subtitle">Everything you need to manage time effectively</p>

        <div className="onboarding__tour-grid">
          <div className="onboarding__tour-card">
            <div className="onboarding__tour-card-icon onboarding__tour-card-icon--blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
              </svg>
            </div>
            <div className="onboarding__tour-card-title">Track Daily Hours</div>
            <div className="onboarding__tour-card-desc">
              Log work hours against your assigned projects with a simple, intuitive interface. Link Jira or GitHub tickets to each entry.
            </div>
          </div>

          <div className="onboarding__tour-card">
            <div className="onboarding__tour-card-icon onboarding__tour-card-icon--green">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4" />
                <path d="M14 10l-2 2 2 2" />
              </svg>
            </div>
            <div className="onboarding__tour-card-title">Submit Timesheets</div>
            <div className="onboarding__tour-card-desc">
              Weekly timesheets are automatically compiled from your logs. Review and submit for manager approval with one click.
            </div>
          </div>

          <div className="onboarding__tour-card">
            <div className="onboarding__tour-card-icon onboarding__tour-card-icon--purple">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 20V10M10 20V4M16 20v-6M22 20v-2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="onboarding__tour-card-title">View Reports</div>
            <div className="onboarding__tour-card-desc">
              Access utilization reports, project breakdowns, and team analytics. Export data for stakeholder presentations.
            </div>
          </div>

          <div className="onboarding__tour-card">
            <div className="onboarding__tour-card-icon onboarding__tour-card-icon--orange">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
              </svg>
            </div>
            <div className="onboarding__tour-card-title">Team Collaboration</div>
            <div className="onboarding__tour-card-desc">
              View your team's workload, collaborate on projects, and stay aligned with real-time activity updates.
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── Step 4: All Set ─────────────────────────────────────────────────────────
  const renderDone = () => (
    <div className="onboarding__step" key="done">
      <div className="onboarding__done">
        <div className="onboarding__done-check">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="onboarding__done-title">You're All Set!</h1>
        <p className="onboarding__done-desc">
          Your workspace is fully configured and ready to go. Here's a quick recap of what's available to you.
        </p>
        <div className="onboarding__done-features">
          <div className="onboarding__done-feature">
            <div className="onboarding__done-feature-icon onboarding__done-feature-icon--blue">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6" /><path d="M8 5v3l2 2" />
              </svg>
            </div>
            <div className="onboarding__done-feature-title">Log Hours</div>
            <div className="onboarding__done-feature-desc">Track your daily work across projects</div>
          </div>
          <div className="onboarding__done-feature">
            <div className="onboarding__done-feature-icon onboarding__done-feature-icon--green">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 2H6a1 1 0 00-1 1v1h6V3a1 1 0 00-1-1z" /><rect x="3" y="4" width="10" height="10" rx="1" /><path d="M6 8h4M6 10.5h3" />
              </svg>
            </div>
            <div className="onboarding__done-feature-title">Timesheets</div>
            <div className="onboarding__done-feature-desc">Submit weekly timesheets for review</div>
          </div>
          <div className="onboarding__done-feature">
            <div className="onboarding__done-feature-icon onboarding__done-feature-icon--purple">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13v-4M7 13V6M11 13V4" /><path d="M1 13h14" />
              </svg>
            </div>
            <div className="onboarding__done-feature-title">Reports</div>
            <div className="onboarding__done-feature-desc">View team utilization & analytics</div>
          </div>
        </div>
      </div>
    </div>
  );

  const steps = [renderWelcome, renderRole, renderTour, renderDone];

  return (
    <div className="onboarding">
      <div className="onboarding__card">
        <button className="onboarding__skip" onClick={handleSkip} type="button">
          Skip tour
        </button>

        {/* Step Content */}
        <div className="onboarding__body">
          {steps[step]()}
        </div>

        {/* Footer */}
        <div className="onboarding__footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="onboarding__dots">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                <div
                  key={i}
                  className={`onboarding__dot${i === step ? ' onboarding__dot--active' : i < step ? ' onboarding__dot--done' : ''}`}
                />
              ))}
            </div>
            <span className="onboarding__step-label">Step {step + 1} of {TOTAL_STEPS}</span>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {step > 0 && (
              <button
                className="onboarding__btn onboarding__btn--ghost"
                onClick={() => setStep(step - 1)}
                type="button"
              >
                Back
              </button>
            )}
            {step < TOTAL_STEPS - 1 ? (
              <button
                className="onboarding__btn onboarding__btn--primary"
                onClick={handleNext}
                type="button"
              >
                {step === 0 ? "Let's Go" : 'Next'}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            ) : (
              <button
                className="onboarding__btn onboarding__btn--success"
                onClick={handleComplete}
                type="button"
              >
                Go to Dashboard
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8h10M9 4l4 4-4 4" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
