import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { invitesApi, type InviteInfo } from '../api/invites';
import { useAppStore } from '../store/useAppStore';

// ── Eye icon ──────────────────────────────────────────────────────────────────
const EyeIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z" />
    <circle cx="8" cy="8" r="2" />
    {!open && <line x1="2" y1="2" x2="14" y2="14" />}
  </svg>
);

// ── Role badge colours ────────────────────────────────────────────────────────
const ROLE_META: Record<string, { label: string; bg: string; color: string; icon: React.ReactNode }> = {
  employee: { label: 'Employee',  bg: '#eff6ff', color: '#2563eb', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
  manager:  { label: 'Manager',   bg: '#f0fdf4', color: '#16a34a', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  admin:    { label: 'Admin',     bg: '#faf5ff', color: '#7c3aed', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
};

// ── States ────────────────────────────────────────────────────────────────────
type PageState = 'loading' | 'ready' | 'submitting' | 'success' | 'expired' | 'used' | 'error';

export const AcceptInvite: React.FC = () => {
  const [params] = useSearchParams();
  const navigate  = useNavigate();
  const { setAuthUser } = useAppStore();
  const token = params.get('token') || '';

  const [pageState, setPageState]   = useState<PageState>('loading');
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [errorMsg, setErrorMsg]     = useState('');

  // ── Form fields ──────────────────────────────────────────────────────────────
  const [firstName,   setFirstName]   = useState('');
  const [lastName,    setLastName]    = useState('');
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError,   setFormError]   = useState('');

  // ── Password strength ────────────────────────────────────────────────────────
  const pwdStrength = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][pwdStrength];
  const strengthColor = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'][pwdStrength];

  // ── Validate token on mount ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token) { setPageState('error'); setErrorMsg('No invite token found in URL.'); return; }
    invitesApi.validate(token)
      .then(info => { setInviteInfo(info); setPageState('ready'); })
      .catch((err: any) => {
        const code = err?.response?.data?.error;
        if (code === 'INVITE_USED')    setPageState('used');
        else if (code === 'INVITE_EXPIRED' || code === 'INVITE_NOT_FOUND') setPageState('expired');
        else { setPageState('error'); setErrorMsg(err?.response?.data?.message || 'Invalid invite link.'); }
      });
  }, [token]);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!firstName.trim()) { setFormError('Full first name is required.'); return; }
    if (username.trim().length < 3) { setFormError('Username must be at least 3 characters.'); return; }
    if (password.length < 6) { setFormError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setFormError('Passwords do not match.'); return; }

    setPageState('submitting');
    try {
      await invitesApi.accept({ token, firstName: firstName.trim(), lastName: lastName.trim(), username: username.trim(), password });
      setPageState('success');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Something went wrong. Please try again.';
      setFormError(msg);
      setPageState('ready');
    }
  };

  // ── Left panel ───────────────────────────────────────────────────────────────
  const LeftPanel = () => (
    <div className="auth-page__left">
      <div className="auth-page__left-logo">
        <div className="auth-page__left-logo-icon">
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M10 3L2 7l8 4 8-4-8-4zM2 11l8 4 8-4M2 15l8 4 8-4" />
          </svg>
        </div>
        <span>eGlobe</span>
      </div>
      <div className="auth-page__left-body">
        <p className="auth-page__left-eyebrow">YOU'RE INVITED</p>
        <h2 className="auth-page__left-headline">
          Join your<br />team today.
        </h2>
        <p className="auth-page__left-desc">
          You've been invited to eGlobe's workforce platform. Set up your account in under a minute and start collaborating.
        </p>
        <ul className="auth-page__features">
          {[
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, text: 'Log your daily work hours' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>, text: 'Track project progress' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, text: 'Submit timesheets for approval' },
            { icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>, text: 'Stay aligned with your team' },
          ].map((f, i) => (
            <li key={i} className="auth-page__feature">
              <span className="auth-page__feature-icon" style={{ fontSize: 16, display: 'flex' }}>{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  // ── Terminal states ───────────────────────────────────────────────────────────
  if (pageState === 'loading') return (
    <div className="auth-page">
      <LeftPanel />
      <div className="auth-page__right">
        <div className="auth-page__form-wrap invite-page__loading">
          <div className="invite-page__spinner" />
          <p style={{ color: '#6b7280', marginTop: 16, fontSize: 14 }}>Validating your invite…</p>
        </div>
      </div>
    </div>
  );

  if (pageState === 'expired') return (
    <div className="auth-page">
      <LeftPanel />
      <div className="auth-page__right">
        <div className="auth-page__form-wrap">
          <div className="invite-page__state-icon invite-page__state-icon--warn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <h1 className="auth-page__title" style={{ textAlign: 'center' }}>Invite Expired</h1>
          <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 14, lineHeight: 1.6 }}>
            This invite link has expired. Invite links are valid for 48 hours.<br />
            Please ask your admin to send a new invite.
          </p>
        </div>
      </div>
    </div>
  );

  if (pageState === 'used') return (
    <div className="auth-page">
      <LeftPanel />
      <div className="auth-page__right">
        <div className="auth-page__form-wrap">
          <div className="invite-page__state-icon invite-page__state-icon--info">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h1 className="auth-page__title" style={{ textAlign: 'center' }}>Already Used</h1>
          <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 14, lineHeight: 1.6 }}>
            This invite link has already been used to create an account.<br />
            If that was you, <button className="auth-page__switch-link" onClick={() => navigate('/login')}>sign in here</button>.
          </p>
        </div>
      </div>
    </div>
  );

  if (pageState === 'error') return (
    <div className="auth-page">
      <LeftPanel />
      <div className="auth-page__right">
        <div className="auth-page__form-wrap">
          <div className="invite-page__state-icon invite-page__state-icon--error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
          </div>
          <h1 className="auth-page__title" style={{ textAlign: 'center' }}>Invalid Link</h1>
          <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 14 }}>{errorMsg}</p>
        </div>
      </div>
    </div>
  );

  if (pageState === 'success') return (
    <div className="auth-page">
      <LeftPanel />
      <div className="auth-page__right">
        <div className="auth-page__form-wrap">
          <div className="invite-page__state-icon invite-page__state-icon--success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="1em" height="1em"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h1 className="auth-page__title" style={{ textAlign: 'center' }}>Account Created!</h1>
          <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 14 }}>
            Your account has been created successfully. Redirecting to the login screen…
          </p>
        </div>
      </div>
    </div>
  );

  const roleMeta = ROLE_META[inviteInfo?.role || 'employee'];

  // ── Main form ─────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <LeftPanel />
      <div className="auth-page__right">
        <div className="auth-page__form-wrap">

          {/* Header */}
          <div className="invite-page__header">
            <h1 className="auth-page__title" style={{ marginBottom: 4 }}>Accept your invite</h1>
            <p className="auth-page__subtitle">
              Invited by <strong>{inviteInfo?.invitedBy}</strong>
            </p>
          </div>

          {/* Info banner */}
          <div className="invite-page__banner">
            <div className="invite-page__banner-row">
              <span className="invite-page__banner-label">Email</span>
              <span className="invite-page__banner-value invite-page__banner-email">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 5 7-5"/>
                </svg>
                {inviteInfo?.email}
              </span>
            </div>
            <div className="invite-page__banner-row">
              <span className="invite-page__banner-label">Role</span>
              <span
                className="invite-page__role-badge"
                style={{ background: roleMeta.bg, color: roleMeta.color }}
              >
                {roleMeta.icon} {roleMeta.label}
              </span>
            </div>
            <div className="invite-page__banner-row">
              <span className="invite-page__banner-label">Department</span>
              <span className="invite-page__banner-value">{inviteInfo?.department}</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="auth-page__form" style={{ marginTop: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-group__label">First name <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  className="form-group__input"
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="Sarah"
                  autoComplete="given-name"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-group__label">Last name</label>
                <input
                  className="form-group__input"
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Chen"
                  autoComplete="family-name"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-group__label">Username <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="form-group__input"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="sarah.chen"
                autoComplete="username"
              />
              {username.length > 0 && username.length < 3 && (
                <p style={{ fontSize: 12, color: '#f97316', marginTop: 4 }}>At least 3 characters</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-group__label">Password <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="auth-page__pwd-wrap">
                <input
                  className="form-group__input auth-page__pwd-input"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                />
                <button type="button" className="auth-page__eye" onClick={() => setShowPwd(v => !v)} tabIndex={-1}>
                  <EyeIcon open={showPwd} />
                </button>
              </div>
              {/* Strength bar */}
              {password.length > 0 && (
                <div style={{ marginTop: 6 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1,2,3,4].map(n => (
                      <div key={n} style={{
                        flex: 1, height: 3, borderRadius: 99,
                        background: n <= pwdStrength ? strengthColor : '#e5e7eb',
                        transition: 'background 0.2s',
                      }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: strengthColor, marginTop: 3, fontWeight: 600 }}>
                    {strengthLabel}
                  </p>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-group__label">Confirm password <span style={{ color: '#ef4444' }}>*</span></label>
              <div className="auth-page__pwd-wrap">
                <input
                  className="form-group__input auth-page__pwd-input"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button type="button" className="auth-page__eye" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                  <EyeIcon open={showConfirm} />
                </button>
              </div>
              {confirm.length > 0 && confirm !== password && (
                <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>Passwords don't match</p>
              )}
            </div>

            {formError && (
              <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 4 }}>{formError}</p>
            )}

            <button
              type="submit"
              className="auth-page__submit-btn"
              disabled={pageState === 'submitting'}
            >
              {pageState === 'submitting' ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span className="invite-page__btn-spinner" /> Creating account…
                </span>
              ) : 'Create my account →'}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af', marginTop: 12 }}>
              Already have an account?{' '}
              <button type="button" className="auth-page__switch-link" onClick={() => navigate('/login')}>
                Sign in
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};
