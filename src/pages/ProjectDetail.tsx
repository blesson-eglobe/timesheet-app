import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject } from '../hooks/useProjects';
import { Badge, statusVariant } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Avatar } from '../components/ui/Avatar';
import { Pagination } from '../components/ui/Pagination';
import { EditProjectModal } from '../components/ui/EditProjectModal';
import { LogTaskDrawer } from '../components/ui/LogTaskDrawer';
import { TimesheetReviewModal } from '../components/ui/TimesheetReviewModal';
import { formatDisplayDate } from '../utils/date';
import { useAppStore } from '../store/useAppStore';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

type TaskStatus = 'Completed' | 'In Progress' | 'Todo' | 'Not Started';
type TaskPriority = 'High' | 'Medium' | 'Low' | 'Critical';

const PRIORITY_META: Record<string, { label: string; bg: string; color: string }> = {
  Critical: { label: 'Critical', bg: '#fee2e2', color: '#991b1b' },
  High:     { label: 'High',     bg: '#fff3e0', color: '#e65100' },
  Medium:   { label: 'Medium',   bg: '#e8f5e9', color: '#2e7d32' },
  Low:      { label: 'Low',      bg: '#f3f4f6', color: '#6b7280' },
};

type TaskFilter = 'all' | 'In Progress' | 'Todo' | 'Completed' | 'Not Started';

export const ProjectDetail: React.FC = () => {
  const { role, currentUser } = useAppStore();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'tasks' | 'team' | 'activity'>('overview');
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [taskPage, setTaskPage] = useState(1);
  const taskPageSize = 10;
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingTaskLog, setEditingTaskLog] = useState<any | null>(null);
  const [isReadOnlyDrawer, setIsReadOnlyDrawer] = useState(false);
  const [selectedMemberLogId, setSelectedMemberLogId] = useState<string | null>(null);

  const { data: project, isLoading } = useProject(id || '');

  const toggleTask = (taskId: string) => {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="page-inner">
        <LoadingSpinner message="Loading project details…" fullPage />
      </div>
    );
  }

  if (!project) {
    return <div className="page-inner"><p style={{ padding: 40, textAlign: 'center' }}>Project not found.</p></div>;
  }

  const handleOpenTaskDrawer = (t: any) => {
    setEditingTaskLog({
      ...t,
      projectId: t.projectId || project?.id,
      projectName: t.projectName || project?.name,
    });
    setIsReadOnlyDrawer(true);
    setShowDrawer(true);
  };

  const members = project.teamMembers || [];
  const tasks = project.tasks || project.recentTasks || [];

  const extras: Record<string, { client: string; color: string; status: string; priority: string }> = {
    p1: { client: 'Internal',    color: '#3b82f6', status: 'Active', priority: 'High' },
    p2: { client: 'RetailMax',   color: '#22c55e', status: 'In Review', priority: 'Medium' },
    p3: { client: 'FinTech Corp',color: '#9333ea', status: 'Active', priority: 'High' },
    p4: { client: 'Internal',    color: '#f97316', status: 'Planning', priority: 'Medium' },
    p5: { client: 'Internal',    color: '#ef4444', status: 'Active', priority: 'Critical' },
  };
  const ex = extras[project.id] ?? { client: 'eGlobe Client', color: '#3b82f6', status: project.status || 'Active', priority: project.priority || 'High' };

  const remaining = Math.max(0, (project.totalHours || 0) - (project.loggedHours || 0));
  const daysLeft = Math.round(remaining / 8);

  const completedTasksCount = tasks.filter((t: { status: string }) => t.status === 'Completed').length;
  const inProgressTasksCount = tasks.filter((t: { status: string }) => t.status === 'In Progress').length;
  const todoTasksCount = tasks.filter((t: { status: string }) => t.status === 'Todo' || t.status === 'Not Started').length;
  const totalTasks = tasks.length || 1;

  const tabs = ['Overview', 'Tasks', 'Team'];
  const tabKeys = ['overview', 'tasks', 'team'] as const;

  return (
    <div className="page-inner">
      {/* Breadcrumb */}
      <div className="proj-detail__breadcrumb">
        <button type="button" className="proj-detail__back" onClick={() => navigate('/projects')}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 12L6 8l4-4"/></svg>
          Back
        </button>
        <button type="button" className="proj-detail__breadcrumb-sep" onClick={() => navigate('/projects')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: '#64748b' }}>Projects</button>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: '#9ca3af' }}><path d="M6 12l4-4-4-4"/></svg>
        <span className="proj-detail__breadcrumb-current">Detail</span>
      </div>

      {/* Project Header Card */}
      <div className="proj-detail__header-card">
        <div className="proj-detail__header-top">
          <div className="proj-detail__header-left">
            <div className="proj-detail__icon" style={{ background: `${ex.color}20`, color: ex.color }}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="20" height="20">
                <path d="M1.5 4.5A1.5 1.5 0 013 3h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 6v6A1.5 1.5 0 0113 13.5H3A1.5 1.5 0 011.5 12V4.5z"/>
              </svg>
            </div>
            <div>
              <h1 className="proj-detail__title">{project.name}</h1>
              <div className="proj-detail__meta">
                <span className="proj-detail__client">{ex.client}</span>
                <span className="proj-detail__dot">·</span>
                <span>Due {project.dueDate || 'N/A'}</span>
                <span className="proj-detail__dot">·</span>
                <span className="proj-detail__days-left">{daysLeft} days left</span>
              </div>
            </div>
          </div>
          <div className="proj-detail__header-badges">
            <Badge variant={project.status === 'On Track' ? 'green' : project.status === 'At Risk' ? 'orange' : 'red'} dot>{project.status}</Badge>
            <Badge variant={project.priority === 'High' || project.priority === 'Critical' ? 'orange' : 'blue'}>{project.priority || 'Medium'}</Badge>
            { (role === 'manager' || role === 'admin') && (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setShowEditModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '5px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#374151',
                  background: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                  cursor: 'pointer',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 2a2 2 0 0 1 2 2l-8 8-4 1 1-4 8-8z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>

        <p className="proj-detail__desc">{project.description || 'No description provided.'}</p>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: 8,
          fontSize: 13,
          margin: '16px 0',
          color: '#334155'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
          </svg>
          <div>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>Project Manager(s): </span>
            <span style={{ fontWeight: 500, color: '#1e293b' }}>
              {project.managers && project.managers.length > 0
                ? project.managers.map((m: any) => m.name).join(', ')
                : 'Rahul (Engineering Lead)'}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div className="proj-detail__stats">
          <div className="proj-detail__stat">
            <div className="proj-detail__stat-label">PROGRESS</div>
            <div className="proj-detail__stat-value">{project.progress}%</div>
          </div>
          <div className="proj-detail__stat-divider"/>
          <div className="proj-detail__stat">
            <div className="proj-detail__stat-label">LOGGED</div>
            <div className="proj-detail__stat-value">{project.loggedHours}h</div>
          </div>
          <div className="proj-detail__stat-divider"/>
          <div className="proj-detail__stat">
            <div className="proj-detail__stat-label">BUDGET</div>
            <div className="proj-detail__stat-value">{project.totalHours > 0 ? `${project.totalHours}h` : 'No budget'}</div>
          </div>
          <div className="proj-detail__stat-divider"/>
          <div className="proj-detail__stat">
            <div className="proj-detail__stat-label">REMAINING</div>
            <div className="proj-detail__stat-value">{project.totalHours > 0 ? `${remaining}h` : 'Ongoing'}</div>
          </div>
        </div>
        <ProgressBar value={project.progress} color={ex.color === '#3b82f6' ? 'blue' : ex.color === '#22c55e' ? 'green' : ex.color === '#9333ea' ? 'purple' : ex.color === '#f97316' ? 'orange' : 'red'} thickness="thick" />
      </div>

      {/* Sub-tabs */}
      <div className="proj-detail__tabs">
        {tabs.map((t, i) => (
          <button
            type="button"
            key={t}
            className={`proj-detail__tab${activeTab === tabKeys[i] ? ' proj-detail__tab--active' : ''}`}
            onClick={() => setActiveTab(tabKeys[i])}
          >
            {t}
            {t === 'Tasks' && <span className="proj-detail__tab-count">{tasks.length}</span>}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="proj-detail__overview-grid">
          {/* Budget vs Logged chart */}
          <div className="proj-detail__chart-card">
            <div className="proj-detail__chart-title">
              {project.totalHours > 0 ? 'Budget vs Logged Hours' : 'Logged Timesheet Hours'}
            </div>
            {project.totalHours > 0 ? (
              <svg width="100%" viewBox="0 0 450 160" preserveAspectRatio="none" style={{ display: 'block', marginTop: 12 }}>
                {[0, Math.round(project.totalHours * 0.25), Math.round(project.totalHours * 0.5), Math.round(project.totalHours * 0.75), project.totalHours || 100].map((v, i) => {
                  const maxBudget = project.totalHours || 100;
                  const y = 15 + (1 - v / maxBudget) * 115;
                  return <g key={i}><line x1="45" y1={y} x2="435" y2={y} stroke="#f0f0f0" strokeWidth="1"/><text x="38" y={y + 3.5} textAnchor="end" fontSize="9.5" fill="#9ca3af">{v}</text></g>;
                })}
                {/* Logged bar */}
                {(() => {
                  const maxBudget = project.totalHours || 100;
                  const rawLh = ((project.loggedHours || 0) / maxBudget) * 115;
                  const lH = project.loggedHours > 0 ? Math.max(6, Math.min(115, rawLh)) : 0;
                  const rH = Math.min(115, (remaining / maxBudget) * 115);
                  return <>
                    <rect x="130" y={130 - lH} width="60" height={lH} rx="4" fill={ex.color}/>
                    <text x="160" y="148" textAnchor="middle" fontSize="10" fill="#4b5563" fontWeight="500">Logged</text>
                    <rect x="290" y={130 - rH} width="60" height={rH} rx="4" fill="#e5e7eb"/>
                    <text x="320" y="148" textAnchor="middle" fontSize="10" fill="#4b5563" fontWeight="500">Remaining</text>
                  </>;
                })()}
              </svg>
            ) : (
              <div style={{ padding: '24px 12px', textAlign: 'center' }}>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#0f172a' }}>
                  {project.loggedHours}h
                </div>
                <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                  Total time accumulated from timesheets and work logs.
                </div>
                <div style={{ display: 'inline-block', marginTop: 12, padding: '4px 12px', background: '#f1f5f9', borderRadius: 6, fontSize: 12, color: '#475569', fontWeight: 500 }}>
                  No budget limit set for this project
                </div>
              </div>
            )}
          </div>

          {/* Task Distribution */}
          <div className="proj-detail__chart-card">
            <div className="proj-detail__chart-title">Task Distribution</div>
            <div className="proj-detail__task-dist">
              {[
                { label: 'Completed',   count: completedTasksCount,  color: '#22c55e', barColor: '#22c55e' },
                { label: 'In Progress', count: inProgressTasksCount, color: '#3b82f6', barColor: '#3b82f6' },
                { label: 'Todo',        count: todoTasksCount,       color: '#9ca3af', barColor: '#d1d5db' },
              ].map(item => (
                <div key={item.label} className="proj-detail__dist-row">
                  <div className="proj-detail__dist-dot" style={{ background: item.color }}/>
                  <span className="proj-detail__dist-label">{item.label}</span>
                  <span className="proj-detail__dist-count">{item.count}</span>
                  <div className="proj-detail__dist-bar-track">
                    <div className="proj-detail__dist-bar-fill" style={{ width: `${(item.count / totalTasks) * 100}%`, background: item.barColor }}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TASKS TAB ── */}
      {activeTab === 'tasks' && (() => {
        const getTaskProgress = (t: any) => {
          const s = (t.taskStatus || t.status || 'In Progress') as string;
          return s === 'Approved' || s === 'Rejected' || s === 'Submitted' || s === 'Pending' ? 'In Progress' : s;
        };

        const filtered = taskFilter === 'all'
          ? tasks
          : tasks.filter((t: any) => {
              const p = getTaskProgress(t);
              if (taskFilter === 'Todo') return p === 'Todo' || p === 'Not Started';
              return p === taskFilter;
            });

        const counts: Record<string, number> = {
          all: tasks.length,
          'In Progress': tasks.filter((t: any) => getTaskProgress(t) === 'In Progress').length,
          Todo: tasks.filter((t: any) => { const p = getTaskProgress(t); return p === 'Todo' || p === 'Not Started'; }).length,
          Completed: tasks.filter((t: any) => getTaskProgress(t) === 'Completed').length,
        };
        const paginatedTasks = filtered.slice((taskPage - 1) * taskPageSize, taskPage * taskPageSize);
        return (
          <div className="task-panel">
            {/* Filter toolbar */}
            <div className="task-panel__toolbar">
              <div className="task-panel__filters">
                {(['all', 'In Progress', 'Todo', 'Completed'] as const).map(f => (
                  <button
                    type="button"
                    key={f}
                    className={`task-panel__filter-btn${taskFilter === f ? ' task-panel__filter-btn--active' : ''}`}
                    onClick={() => { setTaskFilter(f as TaskFilter); setTaskPage(1); }}
                  >
                    {f === 'all' ? 'All' : f}
                    <span className="task-panel__filter-count">{counts[f] || 0}</span>
                  </button>
                ))}
              </div>
              <button type="button" className="task-panel__add-btn" onClick={() => setShowDrawer(true)}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M8 3v10M3 8h10"/>
                </svg>
                Log task
              </button>
            </div>

            {/* Column headers */}
            <div className="task-panel__header">
              <div className="task-panel__col task-panel__col--task">TASK</div>
              <div className="task-panel__col task-panel__col--assignee">ASSIGNEE</div>
              <div className="task-panel__col task-panel__col--priority">PRIORITY</div>
              <div className="task-panel__col task-panel__col--status" style={{ width: 95, flexShrink: 0 }}>APPROVAL</div>
              <div className="task-panel__col task-panel__col--status" style={{ width: 110, flexShrink: 0 }}>PROGRESS</div>
              <div className="task-panel__col task-panel__col--est">HOURS</div>
              <div className="task-panel__col task-panel__col--due" style={{ width: 80, flexShrink: 0 }}>DATE</div>
              <div className="task-panel__col" style={{ width: 45, flexShrink: 0, textAlign: 'center' }}>VIEW</div>
            </div>

            {/* Task rows */}
            <div className="task-panel__list">
              {paginatedTasks.map((t: { id: string; taskName: string; status: string; hours: number; date: string; priority?: string; assignee?: { name: string; initials: string; color: string } }) => {
                const pm = PRIORITY_META[t.priority || 'Medium'] || PRIORITY_META['Medium'];
                return (
                  <div key={t.id} className="task-panel__row">
                    {/* Name */}
                    <div className="task-panel__col task-panel__col--task">
                      <span
                        className="task-panel__task-name task-panel__task-name--link"
                        onClick={() => handleOpenTaskDrawer(t)}
                        style={{ cursor: 'pointer' }}
                        title="Click to open task in drawer"
                      >
                        {t.taskName}
                      </span>
                    </div>

                    {/* Assignee */}
                    <div className="task-panel__col task-panel__col--assignee">
                      {(t.assignee || (t as any).employeeName) && (
                        <div className="task-panel__assignee">
                          <div className="task-panel__avatar" style={{ background: t.assignee?.color || (t as any).employeeColor || '#3b82f6' }}>{t.assignee?.initials || (t as any).employeeInitials || 'ME'}</div>
                          <span className="task-panel__assignee-name">{(t.assignee?.name || (t as any).employeeName || 'User').split(' ')[0]}</span>
                        </div>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="task-panel__col task-panel__col--priority">
                      <span className="task-panel__priority" style={{ background: pm.bg, color: pm.color }}>
                        {pm.label}
                      </span>
                    </div>

                    {/* Approval Status */}
                    <div className="task-panel__col task-panel__col--status" style={{ width: 95, flexShrink: 0 }}>
                      <Badge variant={statusVariant((t as any).timesheetStatus || 'Pending')}>{(t as any).timesheetStatus || 'Pending'}</Badge>
                    </div>

                    {/* Task Status */}
                    <div className="task-panel__col task-panel__col--status" style={{ width: 110, flexShrink: 0 }}>
                      {(() => {
                        const s = ((t as any).taskStatus || t.status || 'In Progress') as string;
                        const display = s === 'Approved' || s === 'Rejected' ? 'In Progress' : s;
                        return (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            fontSize: 12,
                            fontWeight: 600,
                            color: display === 'Completed' ? '#059669' : display === 'In Progress' ? '#2563eb' : '#6b7280'
                          }}>
                            <span style={{
                              width: 6, height: 6, borderRadius: '50%',
                              background: display === 'Completed' ? '#10b981' : display === 'In Progress' ? '#3b82f6' : '#9ca3af'
                            }} />
                            {display}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Hours */}
                    <div className="task-panel__col task-panel__col--est">
                      <span className="task-panel__est">{t.hours}h</span>
                    </div>

                    {/* Due */}
                    <div className="task-panel__col task-panel__col--due" style={{ width: 80, flexShrink: 0 }}>
                      <span className="task-panel__due">{formatDisplayDate(t.date)}</span>
                    </div>

                    {/* Open Drawer Action */}
                    <div className="task-panel__col" style={{ width: 45, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                      <button
                        type="button"
                        title="Open task drawer"
                        onClick={() => handleOpenTaskDrawer(t)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: '#475569', borderRadius: 4 }}
                      >
                        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                          <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/>
                          <circle cx="8" cy="8" r="2.5"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="task-panel__empty">No logged tasks in this project yet.</div>
              )}
            </div>
            <Pagination
              currentPage={taskPage}
              totalItems={filtered.length}
              pageSize={taskPageSize}
              onPageChange={setTaskPage}
            />
          </div>
        );
      })()}

      {/* ── TEAM TAB ── */}
      {activeTab === 'team' && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
            </svg>
            <span>Project Manager(s)</span>
          </div>
          <div className="proj-detail__team-grid" style={{ marginBottom: 32 }}>
            {members.filter((m: any) => m.role === 'manager').length > 0 ? (
              members.filter((m: any) => m.role === 'manager').map((m: any) => {
                const memberLog = tasks.find((t: any) => t.assignee?.name === m.name || t.employeeName === m.name || t.assignee?.initials === m.initials);
                return (
                  <div key={m.id} className="proj-detail__team-card" style={{ border: '2px solid #cbd5e1', background: '#f8fafc' }}>
                    <Avatar initials={m.initials} color={m.color} size="lg"/>
                    <div className="proj-detail__team-name">{m.name}</div>
                    <div className="proj-detail__team-role" style={{ fontWeight: 600, color: '#334155' }}>Project Manager</div>
                    <Badge variant="blue" dot>Lead</Badge>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberLogId(memberLog?.id || `user_${m.id}`)}
                      style={{
                        marginTop: 10,
                        padding: '5px 10px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: '#2563eb',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                        <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/>
                        <circle cx="8" cy="8" r="2.5"/>
                      </svg>
                      View Timesheet
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="proj-detail__team-card" style={{ border: '2px solid #cbd5e1', background: '#f8fafc' }}>
                <Avatar initials="RA" color="#3b82f6" size="lg"/>
                <div className="proj-detail__team-name">Rahul</div>
                <div className="proj-detail__team-role" style={{ fontWeight: 600, color: '#334155' }}>Project Manager (Default)</div>
                <Badge variant="blue" dot>Lead</Badge>
              </div>
            )}
          </div>

          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <span>Team Members</span>
          </div>
          <div className="proj-detail__team-grid">
            {members.filter((m: any) => m.role !== 'manager').map((m: any) => {
              const memberLog = tasks.find((t: any) => t.assignee?.name === m.name || t.employeeName === m.name || t.assignee?.initials === m.initials);
              return (
                <div key={m.id} className="proj-detail__team-card">
                  <Avatar initials={m.initials} color={m.color} size="lg"/>
                  <div className="proj-detail__team-name">{m.name}</div>
                  <div className="proj-detail__team-role">{m.designation || 'Team Member'}</div>
                  <Badge variant="green" dot>Active</Badge>
                  <button
                    type="button"
                    onClick={() => setSelectedMemberLogId(memberLog?.id || `user_${m.id}`)}
                    style={{
                      marginTop: 10,
                      padding: '5px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#2563eb',
                      background: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: 6,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <path d="M1 8s3-5.5 7-5.5S15 8 15 8s-3 5.5-7 5.5S1 8 1 8z"/>
                      <circle cx="8" cy="8" r="2.5"/>
                    </svg>
                    View Timesheet
                  </button>
                </div>
              );
            })}
            {members.filter((m: any) => m.role !== 'manager').length === 0 && (
              <div style={{ color: '#6b7280', fontSize: 13, padding: '16px 0' }}>No additional team members assigned yet.</div>
            )}
          </div>
        </div>
      )}


      {showEditModal && project && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditModal(false)}
          onDeleted={() => navigate('/projects')}
        />
      )}

      {showDrawer && (
        <LogTaskDrawer
          editingLog={editingTaskLog}
          defaultProject={project?.id}
          isReadOnly={isReadOnlyDrawer}
          onClose={() => {
            setShowDrawer(false);
            setEditingTaskLog(null);
            setIsReadOnlyDrawer(false);
          }}
        />
      )}

      {selectedMemberLogId && (
        <TimesheetReviewModal
          approvalId={selectedMemberLogId}
          readOnly={true}
          onClose={() => setSelectedMemberLogId(null)}
        />
      )}
    </div>
  );
};
