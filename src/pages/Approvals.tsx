import React, { useState, useEffect } from 'react';
import { Badge, statusVariant } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { Pagination } from '../components/ui/Pagination';
import { TimesheetReviewModal } from '../components/ui/TimesheetReviewModal';
import { EditTimesheetModal } from '../components/ui/EditTimesheetModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { formatDisplayDate } from '../utils/date';
import { useApprovals, useApproveTimesheet, useRejectTimesheet, useBulkApprove, useBulkReject } from '../hooks/useApprovals';
import { useProjects } from '../hooks/useProjects';
import { useSendReminder } from '../hooks/useNotifications';
import { useAppStore } from '../store/useAppStore';
import { AccessRestricted } from '../components/ui/AccessRestricted';
import type { ApprovalStatus } from '../types';

type FilterTab = 'All' | ApprovalStatus;

export const Approvals: React.FC = () => {
  const { role } = useAppStore();
  const [filter, setFilter] = useState<FilterTab>('All');
  const [searchName, setSearchName] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [searchProject, setSearchProject] = useState('');
  const [searchRole, setSearchRole] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewModalId, setReviewModalId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [editModalItem, setEditModalItem] = useState<any | null>(null);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm' | 'prompt'; validatePrompt?: boolean; defaultValue?: string; placeholder?: string; onConfirm: (val?: string) => void } | null>(null);

  const { data: approvals = [], isLoading } = useApprovals(filter === 'All' ? undefined : filter, searchName || undefined, searchDate || undefined);
  const { data: projects = [] } = useProjects();
  const approveMutation = useApproveTimesheet();
  const rejectMutation = useRejectTimesheet();
  const bulkApproveMutation = useBulkApprove();
  const bulkRejectMutation = useBulkReject();
  const sendReminderMutation = useSendReminder();

  const handleSendReminder = (a: any) => {
    const empName = a.employee?.name || 'the employee';
    setModalConfig({
      isOpen: true,
      title: 'Send Approval Reminder',
      message: `Send an urgent reminder notification to the respective manager to approve ${empName}'s pending timesheet?`,
      type: 'confirm',
      onConfirm: () => {
        setModalConfig(null);
        sendReminderMutation.mutate(
          { message: `HR (Reshma) sent a reminder: Please review and approve pending timesheet for ${empName} (${a.hours}h).` },
          {
            onSuccess: () => {
              setModalConfig({
                isOpen: true,
                title: 'Reminder Sent!',
                message: `Reminder notification successfully sent to the manager for ${empName}'s timesheet.`,
                type: 'alert',
                onConfirm: () => setModalConfig(null)
              });
            }
          }
        );
      }
    });
  };

  const handleSendBulkReminder = () => {
    const targetCount = selected.length > 0 ? selected.length : pending;
    setModalConfig({
      isOpen: true,
      title: 'Send Bulk Approval Reminders',
      message: `Send an approval reminder to all managers to review and approve all ${targetCount} pending timesheet(s)?`,
      type: 'confirm',
      onConfirm: () => {
        setModalConfig(null);
        sendReminderMutation.mutate(
          { message: `HR (Reshma) sent an urgent reminder: You have ${targetCount} pending timesheet(s) awaiting your review and approval.` },
          {
            onSuccess: () => {
              setSelected([]);
              setModalConfig({
                isOpen: true,
                title: 'Reminders Sent!',
                message: `Approval reminders successfully sent to all respective managers.`,
                type: 'alert',
                onConfirm: () => setModalConfig(null)
              });
            }
          }
        );
      }
    });
  };

  const pending  = approvals.filter((a: { status: string }) => a.status === 'Pending').length;
  const approved = approvals.filter((a: { status: string }) => a.status === 'Approved').length;
  const rejected = approvals.filter((a: { status: string }) => a.status === 'Rejected').length;

  const [showCaughtUpToast, setShowCaughtUpToast] = useState(true);

  // Auto-dismiss "All caught up" celebration toast after 5 seconds ("appears like toast and goes")
  useEffect(() => {
    if (pending === 0 && !isLoading) {
      setShowCaughtUpToast(true);
      const timer = setTimeout(() => setShowCaughtUpToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [pending, isLoading]);

  const filtered = React.useMemo(() => {
    let list = approvals.filter((a: any) => {
      if (filter !== 'All' && a.status !== filter) return false;
      if (searchName.trim() && !a.employee?.name?.toLowerCase().includes(searchName.trim().toLowerCase())) return false;
      if (searchDate) {
        const itemDate = a.date || a.submittedDateRaw || a.weekStart || '';
        if (String(itemDate).split('T')[0] !== searchDate) return false;
      }
      if (searchProject && !a.projects?.includes(searchProject)) return false;
      if (searchRole) {
        const empRole = (a.employee?.role || '').toLowerCase() || (
          a.employee?.designation?.toLowerCase().includes('hr') ? 'hr'
          : (a.employee?.designation?.toLowerCase().includes('manager') || a.employee?.designation?.toLowerCase().includes('lead')) ? 'manager'
          : 'employee'
        );
        if (empRole !== searchRole.toLowerCase()) return false;
      }
      return true;
    });

    list.sort((a: any, b: any) => {
      const dA = String(a.submittedDateRaw || a.weekStart || '').split('T')[0];
      const dB = String(b.submittedDateRaw || b.weekStart || '').split('T')[0];
      return dB.localeCompare(dA); // Sort descending to get newest first
    });


    return list;
  }, [approvals, filter, searchName, searchDate, searchProject, searchRole]);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const updateStatus = (id: string, status: ApprovalStatus) => {
    if (status === 'Approved') {
      setModalConfig({
        isOpen: true,
        title: 'Confirm Approval',
        message: 'Are you sure you want to approve this timesheet?',
        type: 'confirm',
        onConfirm: () => {
          setModalConfig(null);
          approveMutation.mutate(id, {
            onSuccess: () => {
              setSelected(s => s.filter(x => x !== id));
              setModalConfig({
                isOpen: true,
                title: 'Success',
                message: 'Timesheet successfully approved.',
                type: 'alert',
                onConfirm: () => setModalConfig(null)
              });
            }
          });
        }
      });
    } else if (status === 'Rejected') {
      setModalConfig({
        isOpen: true,
        title: 'Reject Timesheet',
        message: 'Please provide a clear reason for rejecting this timesheet:',
        type: 'prompt',
        validatePrompt: true,
        placeholder: 'e.g. Hours logged on Tuesday do not match project records…',
        onConfirm: (reason) => {
          setModalConfig(null);
          if (reason !== undefined) {
            rejectMutation.mutate(
              { id, comments: reason },
              { onSuccess: () => {
                setSelected(s => s.filter(x => x !== id));
                setModalConfig({
                  isOpen: true,
                  title: 'Success',
                  message: 'Timesheet successfully rejected.',
                  type: 'alert',
                  onConfirm: () => setModalConfig(null)
                });
              } }
            );
          }
        }
      });
    }
  };

  const toggleSelect = (id: string) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const bulkApproveSelected = () => {
    if (selected.length > 0) {
      setModalConfig({
        isOpen: true,
        title: 'Confirm Bulk Approval',
        message: `Are you sure you want to approve ${selected.length} timesheet(s)?`,
        type: 'confirm',
        onConfirm: () => {
          setModalConfig(null);
          bulkApproveMutation.mutate(selected, {
            onSuccess: () => {
              setSelected([]);
              setModalConfig({
                isOpen: true,
                title: 'Success',
                message: `${selected.length} timesheet(s) successfully approved.`,
                type: 'alert',
                onConfirm: () => setModalConfig(null)
              });
            }
          });
        }
      });
    }
  };

  const bulkRejectSelected = () => {
    if (selected.length > 0) {
      setModalConfig({
        isOpen: true,
        title: 'Bulk Reject Timesheets',
        message: `Please provide a clear reason for rejecting ${selected.length} timesheet(s):`,
        type: 'prompt',
        validatePrompt: true,
        placeholder: 'e.g. Hours logged do not match project records for this period…',
        onConfirm: (reason) => {
          setModalConfig(null);
          if (reason !== undefined) {
            bulkRejectMutation.mutate({ ids: selected, comments: reason }, {
              onSuccess: () => {
                setSelected([]);
                setModalConfig({
                  isOpen: true,
                  title: 'Success',
                  message: `${selected.length} timesheet(s) successfully rejected.`,
                  type: 'alert',
                  onConfirm: () => setModalConfig(null)
                });
              }
            });
          }
        }
      });
    }
  };

  const bulkApproveAllPending = () => {
    const pendingIds = approvals.filter((a: { status: string; id: string }) => a.status === 'Pending').map((a: { id: string }) => a.id);
    if (pendingIds.length > 0) {
      setModalConfig({
        isOpen: true,
        title: 'Confirm Bulk Approval',
        message: `Are you sure you want to approve all ${pendingIds.length} pending timesheet(s)?`,
        type: 'confirm',
        onConfirm: () => {
          setModalConfig(null);
          bulkApproveMutation.mutate(pendingIds, {
            onSuccess: () => {
              setSelected([]);
              setModalConfig({
                isOpen: true,
                title: 'Success',
                message: `All ${pendingIds.length} pending timesheet(s) successfully approved.`,
                type: 'alert',
                onConfirm: () => setModalConfig(null)
              });
            }
          });
        }
      });
    }
  };

  const getSingleTimesheetDate = (a: any) => {
    if (a.date) return formatDisplayDate(String(a.date).split('T')[0]);
    const raw = a.submittedDateRaw || a.weekStart;
    if (raw) return formatDisplayDate(String(raw).split('T')[0]);
    return 'N/A';
  };

  const getSubmittedDate = (a: any) => {
    if (a.submittedDate && a.submittedDate !== 'N/A' && !String(a.submittedDate).includes('–') && !String(a.submittedDate).includes('-') && !String(a.submittedDate).includes('to')) {
      return a.submittedDate;
    }
    const raw = a.submittedDateRaw || a.date;
    if (raw && raw !== 'N/A') return formatDisplayDate(String(raw).split('T')[0]);
    return 'Not submitted';
  };

  if (role !== 'manager' && role !== 'hr' && role !== 'ceo') {
    return <AccessRestricted />;
  }

  if (isLoading && approvals.length === 0) {
    return (
      <div className="page-inner">
        <LoadingSpinner message="Loading approvals…" fullPage />
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="page-header">
        <div className="page-header__row">
          <div>
            <div className="page-header__title">Approvals</div>
            <div className="page-header__subtitle">Review timesheet submissions · Week of Jun 30, 2026</div>
          </div>
        </div>
      </div>

      {/* Floating Celebration Toast when All Caught Up */}
      {pending === 0 && !isLoading && showCaughtUpToast && (
        <div 
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: 12,
            padding: '14px 18px',
            boxShadow: '0 10px 30px rgba(16, 185, 129, 0.2)',
            maxWidth: 420,
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: '#10b981', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M13.5 4.5L6.5 11.5L3 8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#065f46', marginBottom: 2 }}>
              All caught up! No pending timesheets awaiting approval
            </div>
            <div style={{ fontSize: 12, color: '#047857', lineHeight: 1.4 }}>
              Great job staying on top of reviews! All submitted timesheets across your team have been processed.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCaughtUpToast(false)}
            style={{ background: 'none', border: 'none', color: '#059669', cursor: 'pointer', fontSize: 14, padding: '0 2px', lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="approvals__summary">
        <div className="approvals__summary-card approvals__summary-card--pending">
          <span className="approvals__summary-card-count approvals__summary-card-count--pending">{pending}</span>
          <div>
            <div className="approvals__summary-card-label">Pending Review</div>
            <div className="approvals__summary-card-sub">Awaiting action</div>
          </div>
        </div>
        <div className="approvals__summary-card approvals__summary-card--approved">
          <span className="approvals__summary-card-count approvals__summary-card-count--approved">{approved}</span>
          <div>
            <div className="approvals__summary-card-label">Approved</div>
            <div className="approvals__summary-card-sub">This week</div>
          </div>
        </div>
        <div className="approvals__summary-card approvals__summary-card--rejected">
          <span className="approvals__summary-card-count approvals__summary-card-count--rejected">{rejected}</span>
          <div>
            <div className="approvals__summary-card-label">Rejected</div>
            <div className="approvals__summary-card-sub">Need revision</div>
          </div>
        </div>
      </div>

      {/* Informative Note Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: '#f0f9ff',
        border: '1px solid #bae6fd',
        color: '#0369a1',
        padding: '10px 16px',
        borderRadius: 8,
        fontSize: 13,
        marginBottom: 16,
        fontWeight: 500
      }}>
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#0284c7" strokeWidth="1.8" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M8 5v3.5M8 11h.01"/>
        </svg>
        <div>
          <strong>Note:</strong> Employees with <strong>Not Started</strong> timesheets do not appear in this listing until work logs or timesheet entries are submitted for review.
        </div>
      </div>

      {/* Search & Date Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap', background: '#ffffff', padding: '12px 16px', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94a3b8' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
          </svg>
          <input
            type="text"
            placeholder="Search employee by name…"
            value={searchName}
            onChange={e => { setSearchName(e.target.value); setPage(1); }}
            className="form-group__input"
            style={{ paddingLeft: 34, width: '100%', height: 36, fontSize: 13 }}
          />
          {searchName && (
            <button
              type="button"
              onClick={() => { setSearchName(''); setPage(1); }}
              style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >✕</button>
          )}
        </div>

        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 240 }}>
          <select
            value={searchProject}
            onChange={e => { setSearchProject(e.target.value); setPage(1); }}
            className="form-group__select"
            style={{ width: '100%', height: 36, fontSize: 13, paddingLeft: 12 }}
          >
            <option value="">All Projects</option>
            {projects.map((p: any) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {(role === 'ceo' || role === 'hr') && (
          <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 200 }}>
            <select
              value={searchRole}
              onChange={e => { setSearchRole(e.target.value); setPage(1); }}
              className="form-group__select"
              style={{ width: '100%', height: 36, fontSize: 13, paddingLeft: 12, fontWeight: 500 }}
            >
              <option value="">All Roles</option>
              <option value="employee">Employees</option>
              <option value="manager">Managers</option>
              <option value="hr">HRs</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        )}

        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', padding: '4px 12px', borderRadius: 8, border: '1px solid #e2e8f0', cursor: 'pointer' }}
          onClick={() => {
            const el = document.getElementById('approvals-filter-date-input') as HTMLInputElement;
            if (el && el.showPicker) el.showPicker();
            else if (el) el.focus();
          }}
        >
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <svg style={{ width: 14, height: 14, color: '#64748b' }} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M5 1v3M11 1v3"/></svg>
            Filter Date:
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }} >
            {!searchDate && (
              <span style={{ position: 'absolute', left: 6, pointerEvents: 'none', color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
                {new Date().toISOString().split('T')[0]}
              </span>
            )}
            <input
              id="approvals-filter-date-input"
              type="date"
              value={searchDate}
              onChange={e => { setSearchDate(e.target.value); setPage(1); }}
              className="form-group__input"
              style={{ height: 30, padding: '2px 6px', width: 150, border: 'none', background: 'transparent', fontWeight: 600, fontSize: 13, color: !searchDate ? 'transparent' : '#0f172a' }}
              title="Filter timesheets by specific date"
            />
          </div>
          {searchDate && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setSearchDate(''); setPage(1); }}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0 4px', display: 'flex', alignItems: 'center' }}
            >✕</button>
          )}
        </div>



        {(searchName || searchDate || searchProject || searchRole) && (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => { setSearchName(''); setSearchDate(''); setSearchProject(''); setSearchRole(''); setPage(1); }}
            style={{ fontSize: 12, color: '#64748b' }}
          >Reset Filters</button>
        )}
      </div>

      {/* Filters + Bulk */}
      <div className="approvals__filters">
        <div className="approvals__filter-tabs">
          {(['All', 'Pending', 'Approved', 'Rejected'] as FilterTab[]).map(f => (
            <button
              key={f}
              className={`approvals__filter-tab${filter === f ? ' approvals__filter-tab--active' : ''}`}
              onClick={() => { setFilter(f); setPage(1); }}
            >{f}</button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {pending > 0 ? (
            <>
              {filtered.length > 0 && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => {
                    const allSelected = filtered.every((a: { id: string }) => selected.includes(a.id));
                    if (allSelected) {
                      setSelected(s => s.filter(id => !filtered.some((a: { id: string }) => a.id === id)));
                    } else {
                      const newIds = filtered.map((a: { id: string }) => a.id);
                      setSelected(Array.from(new Set([...selected, ...newIds])));
                    }
                  }}
                >
                  {filtered.every((a: { id: string }) => selected.includes(a.id)) ? (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8h10"/></svg>
                      <span>Uncheck All</span>
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4L6 12l-4-4"/></svg>
                      <span>Check All Rows ({filtered.length})</span>
                    </>
                  )}
                </button>
              )}
              {role === 'hr' ? (
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={handleSendBulkReminder}
                  disabled={sendReminderMutation.isPending}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 14px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    boxShadow: '0 1px 3px rgba(217, 119, 6, 0.25)'
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 1.5a5 5 0 015 5v2.5l1 2H2l1-2V6.5a5 5 0 015-5z"/><path d="M6.5 13.5a1.5 1.5 0 003 0"/></svg>
                  <span>Send Reminder to Managers ({selected.length > 0 ? selected.length : pending})</span>
                </button>
              ) : selected.length > 0 ? (
                <>
                  <button type="button" className="btn btn--primary btn--sm" onClick={bulkApproveSelected} disabled={bulkApproveMutation.isPending}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4L6 12l-4-4"/></svg>
                    <span>Approve ({selected.length})</span>
                  </button>
                  <button type="button" className="btn btn--danger btn--sm" onClick={bulkRejectSelected} disabled={bulkRejectMutation.isPending}>
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13"/></svg>
                    <span>Reject ({selected.length})</span>
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => setSelected([])}>
                    <span>Clear</span>
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn--primary btn--sm" onClick={bulkApproveAllPending} disabled={bulkApproveMutation.isPending}>
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4L6 12l-4-4"/></svg>
                  <span>Approve All Pending ({pending})</span>
                </button>
              )}
              <div className={`approvals__tip ${selected.length > 0 ? 'approvals__tip--selected' : ''}`}>
                {selected.length > 0 ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 4L6 12l-4-4"/></svg>
                    <span><strong>{selected.length}</strong> timesheet(s) selected</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 5v3l2 1"/></svg>
                    <span>{role === 'hr' ? 'Check rows to send batch reminders to managers' : 'Check rows to review or batch approve/reject'}</span>
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Table */}
      <div className="data-table--card">
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={filtered.length > 0 && filtered.every((a: { id: string }) => selected.includes(a.id))}
                  onChange={e => setSelected(e.target.checked ? filtered.map((a: { id: string }) => a.id) : [])}
                  title="Check / Uncheck all rows"
                />
              </th>
              <th>Employee</th>
              <th>Task</th>
              <th>Projects</th>
              <th>Date</th>
              <th>Submitted</th>
              <th>Hours</th>
              <th>Status</th>
              <th>{role === 'hr' ? 'Action' : 'Manage'}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && approvals.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  Loading approvals…
                </td>
              </tr>
            ) : paginated.map((a: any) => (
              <tr key={a.id}>
                <td>
                  <input type="checkbox" className="checkbox" checked={selected.includes(a.id)} onChange={() => toggleSelect(a.id)} />
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Avatar initials={a.employee?.initials || 'U'} color={a.employee?.color || '#3b82f6'} size="sm" />
                    <div>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {a.employee?.name || 'Employee'}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{a.employee?.designation || 'Team Member'}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#0f172a' }} title={a.taskName}>
                    {a.taskName ? (a.taskName.length > 40 ? a.taskName.substring(0, 40) + '....' : a.taskName) : 'Work Log Task'}
                  </div>
                </td>
                <td>
                  <div className="approvals__project-list">
                    {(a.projects || []).map((p: string, i: number) => <div key={i}>{p}</div>)}
                  </div>
                </td>
                <td style={{ color: '#0f172a', fontWeight: 500, whiteSpace: 'nowrap' }}>{getSingleTimesheetDate(a)}</td>
                <td style={{ color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>{getSubmittedDate(a)}</td>
                <td style={{ fontWeight: 600 }}>{a.hours}h</td>
                <td><Badge variant={statusVariant(a.status as any)}>{a.status}</Badge></td>
                <td>
                  {role === 'hr' ? (
                    a.status === 'Pending' ? (
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => handleSendReminder(a)}
                        disabled={sendReminderMutation.isPending}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px 12px',
                          fontSize: 12,
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          cursor: 'pointer',
                          boxShadow: '0 1px 2px rgba(217, 119, 6, 0.2)'
                        }}
                        title="Send reminder to manager to approve this timesheet"
                      >
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 1.5a5 5 0 015 5v2.5l1 2H2l1-2V6.5a5 5 0 015-5z"/><path d="M6.5 13.5a1.5 1.5 0 003 0"/></svg>
                        <span>Send Reminder</span>
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                        Processed ({a.status})
                      </span>
                    )
                  ) : (
                    <div className="approvals__actions">
                      {/* View button — always visible */}
                      <button type="button" className="approvals__review-btn" onClick={() => setReviewModalId(a.id)} title="View timesheet details">
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 16, height: 16 }}><path d="M1.5 8c2.5-4 5.5-5.5 6.5-5.5s4 1.5 6.5 5.5c-2.5 4-5.5 5.5-6.5 5.5S4 12 1.5 8z"/><circle cx="8" cy="8" r="2.5"/></svg>
                      </button>
                      {/* Approve — shown for Pending or Rejected (re-approve a rejected timesheet) */}
                      {(a.status === 'Pending' || a.status === 'Rejected') && (
                        <button type="button" className="approvals__action-btn approvals__action-btn--approve" onClick={() => updateStatus(a.id, 'Approved' as any)} disabled={approveMutation.isPending} title={a.status === 'Rejected' ? 'Approve this previously rejected timesheet' : 'Approve timesheet'}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 14, height: 14 }}><path d="M3 8l3 3 7-7"/></svg>
                        </button>
                      )}
                      {/* Reject — shown for Pending or Approved (retract an approval) */}
                      {(a.status === 'Pending' || a.status === 'Approved') && (
                        <button type="button" className="approvals__action-btn approvals__action-btn--reject" onClick={() => updateStatus(a.id, 'Rejected' as any)} disabled={rejectMutation.isPending} title={a.status === 'Approved' ? 'Retract approval and reject timesheet' : 'Reject timesheet'}>
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 14, height: 14 }}><path d="M4 4l8 8M12 4l-8 8"/></svg>
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 24, color: '#6b7280' }}>
                  No approvals found for this filter.
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

      {/* Edit Timesheet Modal Dialog */}
      {editModalItem && <EditTimesheetModal key={editModalItem.id} item={editModalItem} onClose={() => setEditModalItem(null)} />}

      {/* Slide-over Audit & Review Drawer */}
      <TimesheetReviewModal approvalId={reviewModalId} onClose={() => setReviewModalId(null)} />

      {modalConfig && modalConfig.isOpen && (
        <ConfirmModal
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          validatePrompt={modalConfig.validatePrompt}
          placeholder={modalConfig.placeholder}
          defaultValue={modalConfig.defaultValue}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}
    </div>
  );
};
