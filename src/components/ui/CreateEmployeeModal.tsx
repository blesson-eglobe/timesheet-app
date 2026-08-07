import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { useCreateEmployee, useEmployees } from '../../hooks/useEmployees';

interface CreateEmployeeModalProps {
  onClose: () => void;
}

export const CreateEmployeeModal: React.FC<CreateEmployeeModalProps> = ({ onClose }) => {
  const createEmployeeMutation = useCreateEmployee();
  const { data: allUsers = [] } = useEmployees({});

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [designation, setDesignation] = useState('Senior Software Engineer');
  const [role, setRole] = useState('employee');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fieldErrors = {
    firstName: !firstName.trim() ? 'First Name is required.' : undefined,
    email: !email.trim() ? 'Work Email is required.' : !email.includes('@') || !email.includes('.') ? 'Please enter a valid email address.' : undefined,
    designation: !designation.trim() ? 'Designation / Job Title is required.' : undefined,
  };

  const isSubmitDisabled = !!fieldErrors.firstName || !!fieldErrors.email || !!fieldErrors.designation || createEmployeeMutation.isPending;

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) {
      setTouched({ firstName: true, email: true, designation: true });
      return;
    }

    createEmployeeMutation.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        department,
        designation: designation.trim(),
        role,
        reportingManagerId: reportingManagerId || null,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create employee.';
          setError(msg);
        },
      }
    );
  };

  const renderFieldError = (message?: string) => {
    if (!message) return null;
    return (
      <div style={{ fontSize: 12, color: '#ef4444', marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 14, height: 14, flexShrink: 0 }}>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 5v3.5M8 11h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{message}</span>
      </div>
    );
  };

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ width: 520 }}>
        <div className="modal__header">
          <span className="modal__header-title">Add New Employee</span>
          <button type="button" className="modal__header-close" onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal__body">
            {error && <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-group__label">
                  First Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="form-group__input"
                  placeholder="e.g. John"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  onBlur={() => handleBlur('firstName')}
                  autoFocus
                  style={{ borderColor: touched.firstName && fieldErrors.firstName ? '#ef4444' : undefined }}
                />
                {touched.firstName && renderFieldError(fieldErrors.firstName)}
              </div>
              <div className="form-group">
                <label className="form-group__label">
                  Last Name
                </label>
                <input
                  className="form-group__input"
                  placeholder="e.g. Doe"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  onBlur={() => handleBlur('lastName')}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-group__label">
                Work Email <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="email"
                className="form-group__input"
                placeholder="john.doe@eglobe.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => handleBlur('email')}
                style={{ borderColor: touched.email && fieldErrors.email ? '#ef4444' : undefined }}
              />
              {touched.email && renderFieldError(fieldErrors.email)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-group__label">
                  Department <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="form-group__select" value={department} onChange={e => setDepartment(e.target.value)}>
                  <option value="Engineering">Engineering</option>
                  <option value="Design">Design</option>
                  <option value="Product">Product</option>
                  <option value="QA">QA</option>
                  <option value="Marketing">Marketing</option>
                  <option value="HR">HR</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-group__label">
                  Role <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="form-group__select" value={role} onChange={e => setRole(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-group__label">
                Designation / Job Title <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-group__input"
                placeholder="e.g. Senior Frontend Engineer"
                value={designation}
                onChange={e => setDesignation(e.target.value)}
                onBlur={() => handleBlur('designation')}
                style={{ borderColor: touched.designation && fieldErrors.designation ? '#ef4444' : undefined }}
              />
              {touched.designation && renderFieldError(fieldErrors.designation)}
            </div>
            <div className="form-group">
              <label className="form-group__label">
                Reporting Manager
              </label>
              <select className="form-group__select" value={reportingManagerId} onChange={e => setReportingManagerId(e.target.value)}>
                <option value="">None (Top Level)</option>
                {allUsers.filter((u: any) => u.role === 'manager' || u.role === 'admin').map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={createEmployeeMutation.isPending}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitDisabled}
              style={{ opacity: isSubmitDisabled ? 0.5 : 1, cursor: isSubmitDisabled ? 'not-allowed' : 'pointer' }}
            >
              {createEmployeeMutation.isPending ? 'Adding…' : 'Add Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
