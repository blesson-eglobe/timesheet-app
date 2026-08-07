import React, { useState } from 'react';
import { Badge, statusVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Pagination } from '../components/ui/Pagination';
import { CreateEmployeeModal } from '../components/ui/CreateEmployeeModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { useEmployees, useUpdateEmployee } from '../hooks/useEmployees';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { AccessRestricted } from '../components/ui/AccessRestricted';
import { invitesApi } from '../api/invites';

const DEPTS = ['All', 'Engineering', 'Design', 'Product', 'QA', 'Infrastructure', 'Management', 'Executive', 'Human Resources'];
const ROLE_DEPTS = ['Engineering', 'Design', 'Product', 'QA', 'Infrastructure', 'Management', 'Executive', 'Human Resources'];
const INVITE_ROLES = [
  { value: 'employee', label: 'Employee',  desc: 'Can log hours and submit timesheets' },
  { value: 'manager',  label: 'Manager',   desc: 'Can approve timesheets and view reports' },
  { value: 'admin',    label: 'Admin',     desc: 'Full access to all features' },
] as const;

// ─── Invite Modal ──────────────────────────────────────────────────────────────
const InviteModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [email, setEmail]         = useState('');
  const [role, setRole]           = useState<'employee' | 'manager' | 'admin'>('employee');
  const [dept, setDept]           = useState('Engineering');
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied]       = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('Email is required.'); return; }
    setLoading(true);
    try {
      const res = await invitesApi.create({ email: email.trim(), role, department: dept });
      setInviteUrl(res.inviteUrl);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(3px)',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: '32px 32px 28px',
        width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        animation: 'slideUp 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.6">
                  <path d="M8 1v14M1 8h14"/>
                </svg>
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>Invite Team Member</h2>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>Send a role-specific invite link</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4 }}
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M2 2l12 12M14 2L2 14"/>
            </svg>
          </button>
        </div>

        {inviteUrl ? (
          /* ── Success state ── */
          <div>
            <div style={{
              background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12,
              padding: '16px 18px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ fontSize: 22 }}>🎉</div>
              <div>
                <div style={{ fontWeight: 600, color: '#15803d', fontSize: 14, marginBottom: 2 }}>Invite link created!</div>
                <div style={{ fontSize: 12, color: '#166534' }}>Share this link with {email}. It expires in 48 hours.</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invite Link</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px',
              }}>
                <div style={{ flex: 1, fontSize: 12, color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {inviteUrl}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    flexShrink: 0, padding: '6px 14px', borderRadius: 8,
                    background: copied ? '#22c55e' : '#6366f1',
                    color: '#fff', border: 'none', cursor: 'pointer',
                    fontSize: 12, fontWeight: 600, transition: 'background 0.2s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  {copied ? (
                    <><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l4 4 8-8"/></svg> Copied!</>
                  ) : (
                    <><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="5" width="8" height="9" rx="1.5"/><path d="M3 11V3a1 1 0 011-1h8"/></svg> Copy Link</>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => { setInviteUrl(''); setEmail(''); }}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Invite Another
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  background: '#0f172a', border: 'none',
                  color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* ── Form ── */
          <form onSubmit={handleCreate}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-group__label">Email address <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="form-group__input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@eglobeits.com"
                autoFocus
              />
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-group__label">Role <span style={{ color: '#ef4444' }}>*</span></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {INVITE_ROLES.map(r => (
                  <label
                    key={r.value}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `1.5px solid ${role === r.value ? '#6366f1' : '#e2e8f0'}`,
                      background: role === r.value ? '#eef2ff' : '#fafafa',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="radio" name="invite-role" value={r.value}
                      checked={role === r.value}
                      onChange={() => setRole(r.value)}
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{r.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-group__label">Department <span style={{ color: '#ef4444' }}>*</span></label>
              <select
                className="form-group__select"
                value={dept}
                onChange={e => setDept(e.target.value)}
              >
                {ROLE_DEPTS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            {error && (
              <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button" onClick={onClose}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: 10,
                  border: '1.5px solid #e2e8f0', background: '#fff',
                  color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 2, padding: '10px 0', borderRadius: 10,
                  background: loading ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  border: 'none', color: '#fff', fontWeight: 600, fontSize: 13,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {loading ? 'Creating link…' : (
                  <><svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#fff" strokeWidth="1.8"><path d="M13 4l-5 5-2-2M8 14A6 6 0 108 2"/></svg>Generate Invite Link</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export const Employees: React.FC = () => {
  const { role } = useAppStore();
  const updateEmployeeMutation = useUpdateEmployee();
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [confirmModalTarget, setConfirmModalTarget] = useState<{ id: string; name: string; isRowDisabled: boolean } | null>(null);
  const pageSize = 10;

  const { data: employeesData = [], isLoading, isError, refetch } = useEmployees({
    search: search || undefined,
    department: dept === 'All' ? undefined : dept,
  });

  const employees = Array.isArray(employeesData) ? employeesData : [];

  const filtered = React.useMemo(() => {
    return [...employees].sort((a: any, b: any) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [employees]);
  const paginated = viewMode === 'list' ? filtered.slice((page - 1) * pageSize, page * pageSize) : filtered;

  const deptTabs = React.useMemo(() => {
    const depts = new Set<string>();
    employees.forEach((e: any) => { if (e.department) depts.add(e.department); });
    DEPTS.forEach(d => { if (d !== 'All') depts.add(d); });
    return ['All', ...Array.from(depts).sort()];
  }, [employees]);

  if (role !== 'manager' && role !== 'admin' && role !== 'ceo' && role !== 'hr') {
    return <AccessRestricted />;
  }

  if (isLoading && employees.length === 0 && !search) {
    return (
      <div className="page-inner">
        <LoadingSpinner message="Loading team members…" fullPage />
      </div>
    );
  }

  if (isError && employees.length === 0) {
    return (
      <div className="page-inner" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: '#ef4444', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
          Failed to load team members
        </div>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 16 }}>
          An error occurred while connecting to the server.
        </p>
        <button
          onClick={() => refetch()}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <div className="page-header__title">Employees</div>
            <div className="page-header__subtitle">
              {employees.length} team members
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setShowInviteModal(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M1 8.5A5.5 5.5 0 0112 5M8 1l2.5 2.5L8 6"/>
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 11v2M11 12h2"/>
              </svg>
              Invite Member
            </button>
          </div>
        </div>
      </div>

      {/* Search + Dept Tabs */}
      <div className="employees__toolbar">
        <div className="employees__search">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14"/>
          </svg>
          <input placeholder="Search employees…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="employees__toolbar-right">
          <div className="employees__view-toggle">
            <button className={`employees__view-btn${viewMode === 'list' ? ' employees__view-btn--active' : ''}`} onClick={() => setViewMode('list')} title="List View">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 4h13M1.5 8h13M1.5 12h13"/></svg>
            </button>
            <button className={`employees__view-btn${viewMode === 'grid' ? ' employees__view-btn--active' : ''}`} onClick={() => setViewMode('grid')} title="Grid View">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1.5" y="1.5" width="5" height="5" rx="1"/><rect x="9.5" y="1.5" width="5" height="5" rx="1"/><rect x="1.5" y="9.5" width="5" height="5" rx="1"/><rect x="9.5" y="9.5" width="5" height="5" rx="1"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="employees__dept-tabs">
        {deptTabs.map(d => (
          <button
            key={d}
            className={`employees__dept-tab${dept === d ? ' employees__dept-tab--active' : ''}`}
            onClick={() => { setDept(d); setPage(1); }}
          >{d}</button>
        ))}
      </div>

      {viewMode === 'list' ? (
        <div className="data-table--card">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Status</th>
                <th>Projects</th>
                <th>Week Hours</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <div className="employees__employee-cell" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Avatar initials={row.initials} color={row.color} size="md" />
                      <div>
                        <div className="employees__employee-name" style={{ fontWeight: 600, color: '#0f172a' }}>
                          {row.name}
                        </div>
                        {row.designation && (
                          <div style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{row.designation}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="employees__dept-cell-role" style={{ fontWeight: 500, color: '#334155' }}>
                      {row.department || 'General'}
                    </div>
                  </td>
                  <td><Badge variant={statusVariant(row.status as any)} dot>{row.status}</Badge></td>
                  <td style={{ textAlign: 'left' }}>{row.projectCount || 0}</td>
                  <td style={{ fontWeight: 600 }}>{row.weekHours || 0}h</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                      {role === 'admin' && (
                        <button
                          type="button"
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 6,
                            color: row.status === 'Disabled' ? '#047857' : '#b91c1c',
                            background: row.status === 'Disabled' ? '#ecfdf5' : '#fef2f2',
                            border: `1px solid ${row.status === 'Disabled' ? '#a7f3d0' : '#fecaca'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          disabled={updateEmployeeMutation.isPending}
                          onClick={() => {
                            setConfirmModalTarget({
                              id: row.id,
                              name: row.name,
                              isRowDisabled: row.status === 'Disabled'
                            });
                          }}
                        >
                          {row.status === 'Disabled' ? 'Enable' : 'Disable'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                    No employees found matching your search or department filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </div>
      ) : (
        <div>
          <div className="employees__card-grid" style={{ marginBottom: 24 }}>
            {paginated.map((row: any) => (
              <div className="employees__card" key={row.id}>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <Avatar initials={row.initials} color={row.color} size="lg" />
                </div>
                <div className="employees__card-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, color: '#0f172a' }}>
                  {row.name}
                </div>
                <div className="employees__card-role" style={{ color: '#475569', fontWeight: 500 }}>{row.designation || row.department || 'Team Member'}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    <div>Hours: <strong style={{ color: '#0f172a' }}>{row.weekHours || 0}h</strong></div>
                  </div>
                  {role === 'admin' && (
                    <button
                      type="button"
                      style={{
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        color: row.status === 'Disabled' ? '#047857' : '#b91c1c',
                        background: row.status === 'Disabled' ? '#ecfdf5' : '#fef2f2',
                        border: `1px solid ${row.status === 'Disabled' ? '#a7f3d0' : '#fecaca'}`,
                        cursor: 'pointer'
                      }}
                      disabled={updateEmployeeMutation.isPending}
                      onClick={() => {
                        setConfirmModalTarget({
                          id: row.id,
                          name: row.name,
                          isRowDisabled: row.status === 'Disabled'
                        });
                      }}
                    >
                      {row.status === 'Disabled' ? 'Enable' : 'Disable'}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: '#6b7280', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb' }}>
                No employees found matching your search or department filter.
              </div>
            )}
          </div>
        </div>
      )}
      {showCreateModal && <CreateEmployeeModal onClose={() => setShowCreateModal(false)} />}
      {showInviteModal && <InviteModal onClose={() => setShowInviteModal(false)} />}
      {confirmModalTarget && (
        <ConfirmModal
          title={`${confirmModalTarget.isRowDisabled ? 'Enable' : 'Disable'} Employee`}
          message={`Are you sure you want to ${confirmModalTarget.isRowDisabled ? 'enable' : 'disable'} ${confirmModalTarget.name}? ${!confirmModalTarget.isRowDisabled ? 'They will be unable to log timesheets or submit tasks.' : 'They will regain access to log timesheets.'}`}
          confirmText={confirmModalTarget.isRowDisabled ? 'Enable' : 'Disable'}
          cancelText="Cancel"
          onConfirm={() => {
            updateEmployeeMutation.mutate({
              id: confirmModalTarget.id,
              data: { status: confirmModalTarget.isRowDisabled ? 'Active' : 'Disabled' }
            });
            setConfirmModalTarget(null);
          }}
          onCancel={() => setConfirmModalTarget(null)}
        />
      )}
    </div>
  );
};
