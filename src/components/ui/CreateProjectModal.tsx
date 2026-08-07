import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import { useCreateProject, useProjects } from '../../hooks/useProjects';
import { useEmployees } from '../../hooks/useEmployees';
import { useAppStore } from '../../store/useAppStore';

interface CreateProjectModalProps {
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ onClose }) => {
  const { currentUser } = useAppStore();
  const { data: existingProjects } = useProjects();
  const createProjectMutation = useCreateProject();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('Not Started');
  const [priority, setPriority] = useState('Medium');
  const [type, setType] = useState<'Billable' | 'Internal'>('Billable');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const { data: employeesData } = useEmployees();
  const allUsers = employeesData || [];
  const availableManagers = allUsers.filter((u: any) => u.role === 'manager' || u.role === 'admin');
  const availableEmployees = allUsers.filter((u: any) => u.role === 'employee');

  const [selectedManagers, setSelectedManagers] = useState<string[]>(() => {
    if (currentUser?.id && (currentUser?.role === 'manager' || currentUser?.role === 'admin')) {
      return [currentUser.id];
    }
    return [];
  });
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  React.useEffect(() => {
    if (currentUser?.id && (currentUser?.role === 'manager' || currentUser?.role === 'admin')) {
      setSelectedManagers(prev => prev.includes(currentUser.id) ? prev : [...prev, currentUser.id]);
    }
  }, [currentUser?.id, currentUser?.role]);

  const handleToggleManager = (id: string) => {
    setSelectedManagers(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleToggleEmployee = (id: string) => {
    setSelectedEmployees(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const isDuplicate = existingProjects?.some((p: { name: string }) => p.name.trim().toLowerCase() === name.trim().toLowerCase());

  const fieldErrors = {
    name: !name.trim() ? 'Project Name is required.' : isDuplicate ? 'A project with this name already exists.' : undefined,
    type: !type ? 'Project Type is required.' : undefined,
  };

  const isSubmitDisabled =
    !!fieldErrors.name ||
    !!fieldErrors.type ||
    createProjectMutation.isPending;

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleFocus = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: false }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitDisabled) {
      setTouched({ name: true, type: true });
      return;
    }

    const numHours = parseFloat(estimatedHours) || 0;
    createProjectMutation.mutate(
      {
        name: name.trim(),
        description: description.trim(),
        status,
        priority,
        type,
        projectType: type,
        estimatedHours: numHours,
        endDate: endDate || undefined,
        memberIds: [...selectedManagers, ...selectedEmployees],
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to create project.';
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
          <span className="modal__header-title">Create New Project</span>
          <button type="button" className="modal__header-close" onClick={onClose}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal__body">
            {error && <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <div className="form-group">
              <label className="form-group__label">
                Project Name <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="form-group__input"
                placeholder="e.g. Q3 Mobile App Redesign"
                value={name}
                onChange={e => setName(e.target.value)}
                onBlur={() => handleBlur('name')}
                onFocus={() => handleFocus('name')}
                autoFocus
                style={{ borderColor: touched.name && fieldErrors.name ? '#ef4444' : undefined }}
              />
              {touched.name && renderFieldError(fieldErrors.name)}
            </div>
            <div className="form-group">
              <label className="form-group__label">
                Description
              </label>
              <textarea
                className="form-group__input"
                placeholder="Brief summary of project goals and scope..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                onBlur={() => handleBlur('description')}
                style={{ minHeight: 84, padding: '12px 14px', lineHeight: '1.5', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-group__label">
                  Project Type <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="form-group__select" value={type} onChange={e => setType(e.target.value as 'Billable' | 'Internal')}>
                  <option value="Billable">Billable</option>
                  <option value="Internal">Internal</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-group__label">
                  Status <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="form-group__select" value={status} onChange={e => setStatus(e.target.value)}>
                  <option value="Not Started">Not Started</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-group__label">
                  Priority <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <select className="form-group__select" value={priority} onChange={e => setPriority(e.target.value)}>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-group__label">
                  Estimated Budget Hours
                </label>
                <input
                  type="number"
                  className="form-group__input"
                  min="0"
                  step="1"
                  placeholder="e.g. 100"
                  value={estimatedHours}
                  onChange={e => setEstimatedHours(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-group__label">
                  Target Due Date
                </label>
                <input
                  type="date"
                  className="form-group__input"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 8 }}>
              <div className="form-group">
                <label className="form-group__label">
                  Managers
                </label>
                <Select
                  isMulti
                  menuPortalTarget={document.body}
                  options={availableManagers.map((m: any) => ({ value: m.id, label: m.name }))}
                  value={availableManagers.filter((m: any) => selectedManagers.includes(m.id)).map((m: any) => ({ value: m.id, label: m.name }))}
                  onChange={(selected: any) => {
                    setSelectedManagers(selected ? selected.map((o: any) => o.value) : []);
                  }}
                  placeholder="Select managers..."
                  noOptionsMessage={() => "No managers available"}
                  styles={{ 
                    control: (base) => ({
                      ...base,
                      minHeight: 42,
                      borderRadius: 8,
                      borderColor: '#e5e7eb'
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>

              <div className="form-group">
                <label className="form-group__label">
                  Employees
                </label>
                <Select
                  isMulti
                  menuPortalTarget={document.body}
                  options={availableEmployees.map((e: any) => ({ value: e.id, label: e.name }))}
                  value={availableEmployees.filter((e: any) => selectedEmployees.includes(e.id)).map((e: any) => ({ value: e.id, label: e.name }))}
                  onChange={(selected: any) => {
                    setSelectedEmployees(selected ? selected.map((o: any) => o.value) : []);
                  }}
                  placeholder="Select employees..."
                  noOptionsMessage={() => "No employees available"}
                  styles={{ 
                    control: (base) => ({
                      ...base,
                      minHeight: 42,
                      borderRadius: 8,
                      borderColor: '#e5e7eb'
                    }),
                    menuPortal: base => ({ ...base, zIndex: 9999 })
                  }}
                />
              </div>
            </div>
          </div>
          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={createProjectMutation.isPending}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={isSubmitDisabled}
              style={{ opacity: isSubmitDisabled ? 0.5 : 1, cursor: isSubmitDisabled ? 'not-allowed' : 'pointer' }}
            >
              {createProjectMutation.isPending ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
