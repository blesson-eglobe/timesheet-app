import React, { useState } from 'react';
import { Avatar } from './Avatar';
import { Badge, statusVariant } from './Badge';
import { ConfirmModal } from './ConfirmModal';
import { useApprovalDetails, useApproveTimesheet, useRejectTimesheet } from '../../hooks/useApprovals';
import { useAppStore } from '../../store/useAppStore';
import type { ApprovalStatus } from '../../types';

interface TimesheetReviewModalProps {
  approvalId: string | null;
  readOnly?: boolean;
  onClose: () => void;
}

export const TimesheetReviewModal: React.FC<TimesheetReviewModalProps> = ({ approvalId, readOnly = false, onClose }) => {
  const { role, currentUser } = useAppStore();
  const { data, isLoading } = useApprovalDetails(approvalId);
  const approveMutation = useApproveTimesheet();
  const rejectMutation = useRejectTimesheet();

  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectTouched, setRejectTouched] = useState(false);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm: () => void } | null>(null);

  if (!approvalId) return null;

  const isReadOnly = readOnly || role === 'employee' || (currentUser && data?.approval?.employee?.id !== currentUser.id && role !== 'manager' && role !== 'admin' && role !== 'hr' && role !== 'ceo');

  const isRejectDisabled = !rejectReason.trim() || rejectReason.trim().length < 15 || new Set(rejectReason.trim().toLowerCase().replace(/[^a-z]/g, '').split('')).size < 3 || rejectMutation.isPending;

  const handleApprove = () => {
    setModalConfig({
      isOpen: true,
      title: 'Confirm Approval',
      message: 'Are you sure you want to approve this timesheet?',
      type: 'confirm',
      onConfirm: () => {
        setModalConfig(null);
        approveMutation.mutate(approvalId, {
          onSuccess: () => {
            setModalConfig({
              isOpen: true,
              title: 'Success',
              message: 'Timesheet successfully approved.',
              type: 'alert',
              onConfirm: () => {
                setModalConfig(null);
                onClose();
              }
            });
          },
        });
      }
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRejectDisabled) {
      setRejectTouched(true);
      return;
    }
    setModalConfig({
      isOpen: true,
      title: 'Confirm Rejection',
      message: 'Are you sure you want to reject this timesheet?',
      type: 'confirm',
      onConfirm: () => {
        setModalConfig(null);
        rejectMutation.mutate(
          { id: approvalId, comments: rejectReason.trim() },
          {
            onSuccess: () => {
              setModalConfig({
                isOpen: true,
                title: 'Success',
                message: 'Timesheet successfully rejected.',
                type: 'alert',
                onConfirm: () => {
                  setModalConfig(null);
                  onClose();
                }
              });
            },
          }
        );
      }
    });
  };

  const renderFieldError = (message?: string) => {
    if (!message) return null;
    return (
      <div className="review-modal__field-error">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 5v3.5M8 11h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{message}</span>
      </div>
    );
  };

  return (
    <div className="drawer-overlay review-modal__overlay" onClick={onClose}>
      <div
        className="drawer-panel review-modal__panel"
        onClick={e => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="review-modal__header">
          <div>
            <div className="review-modal__title">Timesheet Review & Task Audit</div>
            <div className="review-modal__subtitle">Examine daily distribution and individual work logs before acting</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="review-modal__close-btn"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="review-modal__body">
          {isLoading || !data ? (
            <div className="review-modal__loading">
              <div className="spinner" />
              Loading audit details for timesheet…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Employee Summary Card */}
              <div className="review-modal__card">
                <div className="review-modal__card-info">
                  <Avatar initials={data.approval.employee.initials} color={data.approval.employee.color} size="lg" />
                  <div>
                    <div className="review-modal__user-name">{data.approval.employee.name}</div>
                    <div className="review-modal__user-sub">
                      {data.approval.employee.designation} {data.approval.employee.department && `· ${data.approval.employee.department}`}
                    </div>
                    <div className="review-modal__user-date">
                      Date: <strong>{data.approval.submittedDate || data.approval.weekStart}</strong>
                    </div>
                  </div>
                </div>
                <div className="review-modal__card-stats">
                  <Badge variant={statusVariant(data.approval.status as ApprovalStatus)}>{data.approval.status}</Badge>
                  <div>
                    <span className="review-modal__hours-val">{data.approval.hours.toFixed(1)}</span>
                    <span className="review-modal__hours-max"> / 40.0 hrs</span>
                  </div>
                </div>
              </div>

              {/* Status Comments Banner */}
              {data.approval.comments && (
                <div className={`review-modal__banner review-modal__banner--${data.approval.status === 'Rejected' ? 'rejected' : 'approved'}`}>
                  <span>💬</span>
                  <div>
                    <strong>{data.approval.status === 'Rejected' ? 'Rejection Note:' : 'Review Note:'}</strong> {data.approval.comments}
                  </div>
                </div>
              )}

              {/* Tasks Breakdown Table */}
              <div>
                <div className="review-modal__section-header">
                  <div className="review-modal__section-title">
                    <span>Logged Work Tasks</span>
                    <span className="review-modal__badge-count">
                      {data.logs.length}
                    </span>
                  </div>
                </div>

                {data.logs.length === 0 ? (
                  <div className="review-modal__empty">
                    No granular work log tasks recorded for this period. Total hours were logged directly on the timesheet.
                  </div>
                ) : (
                  <div className="review-modal__table-wrapper">
                    <table className="review-modal__table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Project</th>
                          <th>Task & Description</th>
                          <th style={{ textAlign: 'right' }}>Hours</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.logs.slice().sort((a: any, b: any) => String(a.date || '').localeCompare(String(b.date || ''))).map((log: any, idx: number) => (
                          <tr key={log.id || idx}>
                            <td>
                              {log.date ? new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : '—'}
                            </td>
                            <td>
                              <span className="review-modal__proj-chip">
                                {log.projectName}
                              </span>
                            </td>
                            <td>
                              <div>{log.taskName}</div>
                              {log.taskDescription && (
                                <div className="review-modal__subtitle">{log.taskDescription}</div>
                              )}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600 }}>
                              {log.hours.toFixed(1)}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td colSpan={3} style={{ textAlign: 'right' }}>Total Audited Hours:</td>
                          <td style={{ textAlign: 'right' }}>
                            {data.logs.reduce((acc: number, l: any) => acc + (Number(l.hours) || 0), 0).toFixed(1)}h
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Sticky Footer Action Bar */}
        <div className="review-modal__footer">
          {data && (
            isReadOnly ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#334155', fontWeight: 600, background: '#f1f5f9', padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#2563eb" strokeWidth="1.6">
                    <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/>
                    <circle cx="8" cy="8" r="2.5"/>
                  </svg>
                  <span>View-Only Access · Fellow Employee Timesheet</span>
                </div>
                <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
                  Close
                </button>
              </div>
            ) : showRejectInput ? (
              <form onSubmit={handleRejectSubmit} className="review-modal__reject-form">
                <div className="review-modal__reject-label">
                  Rejection Comments for Employee <span style={{ color: '#ef4444' }}>*</span>
                </div>
                <div>
                  <textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    onBlur={() => setRejectTouched(true)}
                    placeholder="Specify required corrections or discrepancies in hours/tasks…"
                    rows={3}
                    className={`review-modal__textarea ${rejectTouched && !rejectReason.trim() ? 'review-modal__textarea--error' : ''}`}
                  />
                  {rejectTouched && renderFieldError(!rejectReason.trim() ? 'Rejection comments are required.' : undefined)}
                </div>
                <div className="review-modal__action-row">
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() => setShowRejectInput(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn--sm review-modal__btn-confirm-reject"
                    disabled={isRejectDisabled}
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            ) : (
              <div className="review-modal__action-row">
                <div style={{ display: 'flex', gap: 10 }}>
                  {/* Reject button — only shown when not already Rejected */}
                  {data.approval.status !== 'Rejected' && (
                    <button
                      type="button"
                      onClick={() => setShowRejectInput(true)}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="review-modal__btn-reject"
                    >
                      ✕ Reject…
                    </button>
                  )}
                  {/* Approve button — only shown when not already Approved */}
                  {data.approval.status !== 'Approved' && (
                    <button
                      type="button"
                      onClick={handleApprove}
                      disabled={approveMutation.isPending || rejectMutation.isPending}
                      className="review-modal__btn-approve"
                    >
                      {approveMutation.isPending ? 'Approving…' : data.approval.status === 'Rejected' ? '✓ Approve (Overrule Rejection)' : '✓ Approve Timesheet'}
                    </button>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      </div>
      {modalConfig && modalConfig.isOpen && (
        <ConfirmModal
          title={modalConfig.title}
          message={modalConfig.message}
          type={modalConfig.type}
          onConfirm={modalConfig.onConfirm}
          onCancel={() => setModalConfig(null)}
        />
      )}
    </div>
  );
};
