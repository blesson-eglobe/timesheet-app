import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useWorkLogs, useSubmitWeek, useDeleteWorkLog } from '../hooks/useWorkLogs';
import { useProjects } from '../hooks/useProjects';
import { LogTaskDrawer } from '../components/ui/LogTaskDrawer';
import { TaskDescriptionModal } from '../components/ui/TaskDescriptionModal';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Pagination } from '../components/ui/Pagination';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Badge, statusVariant } from '../components/ui/Badge';
import { formatDisplayDate, getISOWeekString, getDateFromISOWeekString } from '../utils/date';
import type { TaskStatus } from '../types';

const DAYS  = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const addDaysToDateString = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const getWeekRangeForDateString = (dateStr: string): { start: string; end: string } => {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const startD = new Date(d);
  startD.setDate(d.getDate() + diffToMon);
  const endD = new Date(startD);
  endD.setDate(startD.getDate() + 6);
  return {
    start: startD.toISOString().slice(0, 10),
    end: endD.toISOString().slice(0, 10),
  };
};

const formatWeekRangeLabel = (startStr: string, endStr: string): string => {
  const s = new Date(startStr + 'T12:00:00');
  const e = new Date(endStr + 'T12:00:00');
  const sMonth = s.toLocaleDateString('en-US', { month: 'short' });
  const eMonth = e.toLocaleDateString('en-US', { month: 'short' });
  const sDay = s.getDate();
  const eDay = e.getDate();
  const year = s.getFullYear();
  if (sMonth === eMonth) {
    return `${sMonth} ${sDay} – ${eDay}, ${year}`;
  }
  return `${sMonth} ${sDay} – ${eMonth} ${eDay}, ${year}`;
};

// ─── Ticket provider meta ─────────────────────────────────────────────────────
const PROVIDER_META: Record<string, { bg: string; color: string; abbr: string }> = {
  Jira:   { bg: '#eff6ff', color: '#2563eb', abbr: 'JIRA'   },
  GitHub: { bg: '#f3f4f6', color: '#374151', abbr: 'GITHUB' },
  Linear: { bg: '#f5f3ff', color: '#7c3aed', abbr: 'LINEAR' },
};

// ─── Project color helper ─────────────────────────────────────────────────────
const projColor = (name: string) =>
  name.includes('Core')        ? '#3b82f6'
  : name.includes('Analytics') ? '#22c55e'
  : name.includes('Client')    ? '#a855f7'
  : name.includes('Mobile')    ? '#f97316'
  : '#0891b2';

// ─── Work Logs Page ───────────────────────────────────────────────────────────
export const WorkLogs: React.FC = () => {
  const navigate = useNavigate();
  const { role } = useAppStore();
  const [view, setView]               = useState<'list' | 'grid'>('list');
  const [showDrawer, setShowDrawer]   = useState(false);
  const [isReadOnlyDrawer, setIsReadOnlyDrawer] = useState(false);
  const [editingLog, setEditingLog]   = useState<any | null>(null);
  const [viewDescLog, setViewDescLog] = useState<any | null>(null);
  const [search, setSearch]           = useState('');
  const [dateMode, setDateMode]       = useState<'day' | 'week'>('day');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage]               = useState(1);
  const [gridProjectIds, setGridProjectIds] = useState<string[]>([]);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const pageSize = 10;
  const todayStr = new Date().toISOString().slice(0, 10);
  const [modalConfig, setModalConfig] = useState<{ isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm'; onConfirm: () => void } | null>(null);

  const { data: workLogs = [], isLoading } = useWorkLogs({ search });
  const { data: projects = [] } = useProjects();
  const submitWeekMutation = useSubmitWeek();
  const deleteWorkLogMutation = useDeleteWorkLog();

  const filteredBySearch = workLogs.filter((l: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const taskName = (l.taskName || '').toLowerCase();
    const projName = (l.projectName || '').toLowerCase();
    const taskDesc = (l.taskDescription || l.description || '').toLowerCase();
    const ticketsMatch = (l.tickets || []).some((t: any) =>
      (typeof t === 'string' ? t : t.ticketNumber || '').toLowerCase().includes(q)
    );
    return taskName.includes(q) || projName.includes(q) || taskDesc.includes(q) || ticketsMatch;
  });

  const filtered = React.useMemo(() => {
    const list = filteredBySearch.filter((l: any) => {
      if (!l.date) return false;
      const logDate = String(l.date).split('T')[0];
      if (dateMode === 'day') {
        return logDate === selectedDate;
      } else {
        const { start, end } = getWeekRangeForDateString(selectedDate);
        return logDate >= start && logDate <= end;
      }
    });
    return list.sort((a: any, b: any) => {
      const dA = String(a.date || '').split('T')[0];
      const dB = String(b.date || '').split('T')[0];
      return dA.localeCompare(dB);
    });
  }, [filteredBySearch, dateMode, selectedDate]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const dateNavLabel = React.useMemo(() => {
    if (dateMode === 'day') {
      const d = new Date(selectedDate + 'T12:00:00');
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    } else {
      const { start, end } = getWeekRangeForDateString(selectedDate);
      return formatWeekRangeLabel(start, end);
    }
  }, [dateMode, selectedDate]);

  const gridDays = React.useMemo(() => {
    const { start } = getWeekRangeForDateString(selectedDate);
    const d = new Date(start + 'T12:00:00');
    const daysList: { name: string; label: string; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const cur = new Date(d);
      cur.setDate(d.getDate() + i);
      const dateStr = cur.toISOString().slice(0, 10);
      const month = cur.toLocaleDateString('en-US', { month: 'short' });
      const day = cur.getDate();
      daysList.push({
        name: DAYS[i] || '',
        label: `${month} ${day}`,
        dateStr,
      });
    }
    return daysList;
  }, [selectedDate]);

  const totalHours = filtered.reduce((s: number, l: { hours: number }) => s + (l.hours || 0), 0);

  const displayedProjects = React.useMemo(() => {
    if (gridProjectIds.length > 0) {
      return gridProjectIds
        .map(id => projects.find((p: { id: string }) => p.id === id))
        .filter(Boolean) as typeof projects;
    }
    if (projects.length === 0) return [];
    const withLogs = projects.filter((p: { id: string }) =>
      workLogs.some((l: { projectId?: string }) => l.projectId === p.id)
    );
    return (withLogs.length > 0 ? withLogs : projects.slice(0, 2)) as typeof projects;
  }, [gridProjectIds, projects, workLogs]);

  const unaddedProjects = React.useMemo(() => {
    const displayedIds = new Set(displayedProjects.map((p: { id: string }) => p.id));
    return projects.filter((p: { id: string }) => !displayedIds.has(p.id));
  }, [projects, displayedProjects]);

  const handleRemoveProject = (idToRemove: string) => {
    const current = gridProjectIds.length > 0
      ? gridProjectIds
      : displayedProjects.map((p: { id: string }) => p.id);
    setGridProjectIds(current.filter(id => id !== idToRemove));
  };

  const handleAddProject = (idToAdd: string) => {
    const current = gridProjectIds.length > 0
      ? gridProjectIds
      : displayedProjects.map((p: { id: string }) => p.id);
    if (!current.includes(idToAdd)) {
      setGridProjectIds([...current, idToAdd]);
    }
  };

  const handleSubmitWeek = () => {
    const { start } = getWeekRangeForDateString(selectedDate);
    submitWeekMutation.mutate(start, {
      onSuccess: (data: Record<string, unknown>) => {
        const mgrText = data?.managerName ? ` to ${data.managerName}` : '';
        setModalConfig({
          isOpen: true,
          title: 'Success',
          message: `Timesheet submitted for approval${mgrText}!`,
          type: 'alert',
          onConfirm: () => setModalConfig(null)
        });
      },
      onError: () => {
        setModalConfig({
          isOpen: true,
          title: 'Error',
          message: 'Failed to submit timesheet or already submitted.',
          type: 'alert',
          onConfirm: () => setModalConfig(null)
        });
      },
    });
  };

  if (isLoading && !workLogs.length && !search) {
    return (
      <div className="page-inner">
        <LoadingSpinner message="Loading work logs…" fullPage />
      </div>
    );
  }

  return (
    <div className="page-inner">
      <div className="page-header">
        <div className="page-header__row worklogs__header-row">
          <div>
            <div className="page-header__title">Work Logs</div>
          </div>
          <button
            type="button"
            className="btn btn--primary worklogs__log-task-btn"
            onClick={() => { setEditingLog(null); setIsReadOnlyDrawer(false); setShowDrawer(true); }}
          >
            + Log Task
          </button>
        </div>
      </div>

      {/* ── Daily / Weekly Progress & Date Control Hero Banner ── */}
      {(() => {
        const target = dateMode === 'day' ? 8 : 40;
        const remaining = Math.max(0, target - totalHours);
        const pct = Math.min(100, (totalHours / target) * 100);
        const isOver = totalHours > target;
        const barColor = isOver ? '#ef4444' : pct >= 75 ? '#f97316' : '#6366f1';
        const period = dateMode === 'day'
          ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
          : `Week of ${dateNavLabel}`;
        return (
          <div className="worklogs__hero-banner">
            {/* Left side: Date Navigator + Period Heading + Entry Count */}
            <div className="worklogs__hero-left">
              {/* Date Controls */}
              <div className="worklogs__hero-date-controls">
                <div className="worklogs__week-nav">
                  <button
                    type="button"
                    className="worklogs__week-btn"
                    onClick={() => setSelectedDate(prev => addDaysToDateString(prev, dateMode === 'day' ? -1 : -7))}
                    title={dateMode === 'day' ? 'Previous day' : 'Previous week'}
                    aria-label="Previous"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M10 12l-4-4 4-4"/></svg>
                  </button>

                  {dateMode === 'day' ? (
                    <input
                      type="date"
                      className="worklogs__date-picker"
                      max={todayStr}
                      value={selectedDate}
                      onChange={e => {
                        if (e.target.value) setSelectedDate(e.target.value);
                      }}
                      title="Choose a single date"
                    />
                  ) : (
                    <span className="worklogs__week-label">{dateNavLabel}</span>
                  )}

                  <button
                    type="button"
                    className="worklogs__week-btn"
                    onClick={() => setSelectedDate(prev => addDaysToDateString(prev, dateMode === 'day' ? 1 : 7))}
                    title={dateMode === 'day' ? 'Next day' : 'Next week'}
                    aria-label="Next"
                  >
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M6 12l4-4-4-4"/></svg>
                  </button>
                </div>
              </div>

              {/* Date Title & Count */}
              <div>
                <div className="worklogs__hero-title">
                  {period}
                </div>
                <div className="worklogs__hero-subtitle">
                  {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} logged
                </div>
              </div>
            </div>

            {/* Right side: Flat layout of Stats & Circular Ring */}
            <div className="worklogs__hero-right">
              
              {/* Circular Progress Indicator */}
              <div className="worklogs__circular-ring">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="25" stroke="#f1f5f9" strokeWidth="6" fill="none" />
                  <circle cx="30" cy="30" r="25" stroke={barColor} strokeWidth="6" fill="none" 
                    strokeDasharray={157.08} 
                    strokeDashoffset={157.08 - (pct / 100) * 157.08} 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="worklogs__circular-val">
                  {Math.round(pct)}%
                </div>
              </div>

              {/* Vertical Separator */}
              <div className="worklogs__hero-divider" />

              {/* LOGGED STAT (Primary Highlight Metric) */}
              <div className="worklogs__hero-stat">
                <div className="worklogs__stat-label">
                  LOGGED
                </div>
                <div className="worklogs__stat-val worklogs__stat-val--primary">
                  {totalHours.toFixed(1)}<span className="worklogs__stat-unit worklogs__stat-unit--primary">h</span>
                </div>
              </div>

              {/* TARGET STAT */}
              <div className="worklogs__hero-stat">
                <div className="worklogs__stat-label">
                  TARGET
                </div>
                <div className="worklogs__stat-val worklogs__stat-val--target">
                  {target.toFixed(1)}<span className="worklogs__stat-unit worklogs__stat-unit--target">h</span>
                </div>
              </div>

              {/* REMAINING / OVER STAT */}
              <div className="worklogs__hero-stat">
                <div className="worklogs__stat-label">
                  {isOver ? 'OVER TARGET' : 'REMAINING'}
                </div>
                <div className={`worklogs__stat-val ${isOver ? 'worklogs__stat-val--over' : 'worklogs__stat-val--remaining'}`}>
                  {isOver ? `+${(totalHours - target).toFixed(1)}` : remaining.toFixed(1)}<span className={`worklogs__stat-unit ${isOver ? 'worklogs__stat-unit--over' : 'worklogs__stat-unit--remaining'}`}>h</span>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── Single Unified Toolbar (Search Left, View & Actions Right) ── */}
      <div className="worklogs__toolbar">
        {/* Search on Left */}
        <div className="worklogs__search">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14"/>
          </svg>
          <input placeholder="Search tasks, tickets..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Views & Actions on Right */}
        <div className="worklogs__toolbar-right">
          <div className="worklogs__view-toggle">
            <button
              type="button"
              className={`worklogs__view-btn${view === 'list' ? ' worklogs__view-btn--active' : ''}`}
              onClick={() => setView('list')}
            >Task Log</button>
            <button
              type="button"
              className={`worklogs__view-btn${view === 'grid' ? ' worklogs__view-btn--active' : ''}`}
              onClick={() => setView('grid')}
            >Weekly Grid</button>
          </div>
          <button type="button" className="btn btn--ghost" onClick={handleSubmitWeek} disabled={submitWeekMutation.isPending}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2L2 7l4 2 2 4 6-11z"/><path d="M6 9l3 3"/>
            </svg>
            {submitWeekMutation.isPending ? 'Submitting…' : 'Submit Week'}
          </button>
        </div>
      </div>

      {/* ── LIST VIEW ── */}
      {/* ── LIST VIEW ── */}
      {view === 'list' ? (
        <div className="wl-panel">
          {/* Column headers */}
          <div className="wl-panel__header">
            <div className="wl-panel__col wl-panel__col--task">TASK</div>
            <div className="wl-panel__col wl-panel__col--project">PROJECT</div>
            <div className="wl-panel__col wl-panel__col--desc">DESC</div>
            <div className="wl-panel__col wl-panel__col--hours">HOURS</div>
            <div className="wl-panel__col wl-panel__col--date">DATE</div>
            <div className="wl-panel__col wl-panel__col--status-sm">APPROVAL</div>
            <div className="wl-panel__col wl-panel__col--status-md">PROGRESS</div>
            <div className="wl-panel__col wl-panel__col--actions">ACTIONS</div>
          </div>

          {/* Rows */}
          <div className="wl-panel__list">
            {paginated.map((log: any) => {
              const color = projColor(log.projectName || '');
              const isLocked = log.status === 'Approved' || log.status === 'Rejected' || log.timesheetStatus === 'Approved' || log.timesheetStatus === 'Rejected';
              return (
                <div key={log.id} className="wl-panel__row">

                  {/* Task (First Column) */}
                  <div className="wl-panel__col wl-panel__col--task">
                    <div
                      className="wl-panel__task-name wl-panel__task-name--link"
                      onClick={() => {
                        setEditingLog(log);
                        setIsReadOnlyDrawer(isLocked);
                        setShowDrawer(true);
                      }}
                      title={isLocked ? "View task details (Read-only)" : "Edit task log in drawer"}
                    >
                      {log.taskName}
                    </div>
                  </div>

                  {/* Project (Second Column) */}
                  <div className="wl-panel__col wl-panel__col--project">
                    <div className="wl-panel__project-meta">
                      <span className="wl-panel__proj-name">{log.projectName || 'General'}</span>
                    </div>
                  </div>

                  {/* Description Column (Icon Only) */}
                  <div className="wl-panel__col wl-panel__col--desc">
                    <button
                      type="button"
                      className="wl-panel__desc-btn"
                      onClick={() => setViewDescLog(log)}
                      title="View task description"
                    >
                      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 8s3-4.5 7-4.5 7 4.5 7 4.5-3 4.5-7 4.5-7-4.5-7-4.5z" />
                        <circle cx="8" cy="8" r="2" />
                      </svg>
                    </button>
                  </div>

                  {/* Hours */}
                  <div className="wl-panel__col wl-panel__col--hours">
                    <span className="wl-panel__hours">{log.hours}h</span>
                  </div>

                  {/* Date */}
                  <div className="wl-panel__col wl-panel__col--date">
                    <span className="wl-panel__date">
                      {log.date
                        ? new Date(String(log.date).split('T')[0] + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : formatDisplayDate(selectedDate)}
                    </span>
                  </div>

                  {/* Approval Status */}
                  <div className="wl-panel__col wl-panel__col--status-sm">
                    <Badge variant={statusVariant(log.timesheetStatus || 'Pending')}>{log.timesheetStatus || 'Pending'}</Badge>
                  </div>

                  {/* Task Status */}
                  <div className="wl-panel__col wl-panel__col--status-md">
                    {(() => {
                      const s = (log.taskStatus || log.status || 'In Progress') as string;
                      const display = s === 'Approved' || s === 'Rejected' ? 'In Progress' : s;
                      const variant = display === 'Completed' ? 'completed' : display === 'In Progress' ? 'in-progress' : 'other';
                      return (
                        <span className={`wl-panel__task-status wl-panel__task-status--${variant}`}>
                          <span className={`wl-panel__task-status-dot wl-panel__task-status-dot--${variant}`} />
                          {display}
                        </span>
                      );
                    })()}
                  </div>

                  {/* Actions */}
                  <div className="wl-panel__col wl-panel__col--actions">
                    <div className="wl-panel__actions">
                      <button
                        type="button"
                        className="wl-panel__edit-btn"
                        onClick={() => { setEditingLog(log); setIsReadOnlyDrawer(false); setShowDrawer(true); }}
                        title="Edit timesheet entry"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11.06 1.94a1.5 1.5 0 0 1 2.12 2.12L4.5 12.73 1.5 13.5l.77-3L11.06 1.94z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="wl-panel__delete-btn"
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: 'Confirm Delete',
                            message: `Delete timesheet entry "${log.taskName}"?`,
                            type: 'confirm',
                            onConfirm: () => {
                              deleteWorkLogMutation.mutate(log.id);
                              setModalConfig(null);
                            }
                          });
                        }}
                        title="Delete timesheet entry"
                      >
                        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M2.5 4h11" />
                          <path d="M5.5 4V2.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V4" />
                          <path d="M3.5 4l.8 9.2a1.5 1.5 0 0 0 1.5 1.3h4.4a1.5 1.5 0 0 0 1.5-1.3L12.5 4" />
                          <path d="M6.5 7v4.5" />
                          <path d="M9.5 7v4.5" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="wl-panel__empty">
                <div className="wl-panel__empty-title">
                  No timesheet entries found for {dateMode === 'day' ? formatDisplayDate(selectedDate) : dateNavLabel}.
                </div>
                <button
                  type="button"
                  className="btn btn--primary wl-panel__empty-btn"
                  onClick={() => { setEditingLog(null); setIsReadOnlyDrawer(false); setShowDrawer(true); }}
                >
                  + Log Task for {dateMode === 'day' ? formatDisplayDate(selectedDate) : 'This Week'}
                </button>
              </div>
            )}
          </div>
          <Pagination
            currentPage={page}
            totalItems={filtered.length}
            pageSize={pageSize}
            onPageChange={setPage}
            alwaysShow={true}
          />
        </div>

      ) : (
        /* ── WEEKLY GRID VIEW ── */
        <div className="worklogs__grid">
          <table className="worklogs__grid-table">
            <thead>
              <tr>
                <th className="worklogs__grid-th worklogs__grid-th--proj">PROJECT</th>
                {gridDays.map((d, i) => (
                  <th key={d.dateStr} className={`worklogs__grid-th worklogs__grid-th--day ${d.dateStr === selectedDate ? 'worklogs__grid-col--active' : ''}`}>
                    <span className="worklogs__grid-day-name">{d.name}</span>
                    <span className="worklogs__grid-day-date">{d.label}</span>
                  </th>
                ))}
                <th className="worklogs__grid-th worklogs__grid-th--total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {displayedProjects.map((p: { id: string; name: string }) => {
                const logs = workLogs.filter((l: { projectId: string }) => l.projectId === p.id);
                const rowTotal = logs.reduce((s: number, l: { hours: number }) => s + (l.hours || 0), 0);
                return (
                  <tr key={p.id} className="worklogs__grid-row">
                    <td className="worklogs__grid-td worklogs__grid-td--proj">
                      <div className="worklogs__grid-proj-info">
                        <span
                          className="worklogs__grid-proj-name"
                          onClick={() => navigate(`/projects/${p.id}`)}
                        >
                          {p.name}
                        </span>
                      </div>
                      {role !== 'manager' && (
                        <button
                          type="button"
                          className="worklogs__grid-remove-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveProject(p.id);
                          }}
                          title="Remove project row"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                    {gridDays.map((day, i) => {
                      const dayLogs = logs.filter((l: any) => l.date && String(l.date).split('T')[0] === day.dateStr);
                      const h = dayLogs.reduce((acc: number, l: any) => acc + (l.hours || 0), 0);
                      return (
                        <td
                          key={day.dateStr}
                          className={`worklogs__grid-td worklogs__grid-td--day ${day.dateStr === selectedDate ? 'worklogs__grid-col--active' : ''}`}
                        >
                          {h > 0 ? (
                            <span
                              className="worklogs__grid-hours worklogs__grid-hours--link"
                              title="Click to edit task log"
                              onClick={() => {
                                const found = dayLogs[0];
                                if (found) {
                                  setEditingLog(found);
                                  setShowDrawer(true);
                                }
                              }}
                            >{Number.isInteger(h) ? h : h.toFixed(1)}</span>
                          ) : (
                            <span
                              className={`worklogs__grid-dash ${day.dateStr > todayStr ? 'worklogs__grid-dash--disabled' : 'worklogs__grid-dash--clickable'}`}
                              title={day.dateStr > todayStr ? 'Cannot log tasks for future dates' : 'Click to log task for this date'}
                              onClick={() => {
                                if (day.dateStr > todayStr) {
                                  setModalConfig({
                                    isOpen: true,
                                    title: 'Invalid Date',
                                    message: 'Cannot log tasks for future dates.',
                                    type: 'alert',
                                    onConfirm: () => setModalConfig(null)
                                  });
                                  return;
                                }
                                setSelectedDate(day.dateStr);
                                setEditingLog(null);
                                setShowDrawer(true);
                              }}
                            >–</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="worklogs__grid-td worklogs__grid-td--total">
                      <span className="worklogs__grid-total-val">{rowTotal.toFixed(1)}h</span>
                    </td>
                  </tr>
                );
              })}

              {/* Add project row */}
              {role !== 'manager' && (
                <tr className="worklogs__grid-add-row">
                  <td colSpan={7} className="worklogs__grid-add-td">
                    <div className="worklogs__grid-add-wrapper">
                      <button
                        type="button"
                        className="worklogs__grid-add-btn"
                        onClick={() => setShowAddMenu(!showAddMenu)}
                      >
                        <span className="worklogs__grid-add-icon">+</span> Add project row
                      </button>
                      {showAddMenu && (
                        <div className="worklogs__grid-dropdown">
                          {unaddedProjects.length > 0 ? (
                            unaddedProjects.map((p: any) => (
                              <div
                                key={p.id}
                                className="worklogs__grid-dropdown-item"
                                onClick={() => {
                                  handleAddProject(p.id);
                                  setShowAddMenu(false);
                                }}
                              >
                                <span
                                  className="worklogs__grid-dropdown-dot"
                                  style={{ backgroundColor: projColor(p.name) }}
                                />
                                {p.name}
                              </div>
                            ))
                          ) : (
                            <div className="worklogs__grid-dropdown-empty">All available projects added</div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="worklogs__grid-footer-row">
                <td className="worklogs__grid-td worklogs__grid-td--footer-label">DAILY TOTAL</td>
                {gridDays.map((day, i) => {
                  const dayTotal = filtered
                    .filter((l: any) => l.date && String(l.date).split('T')[0] === day.dateStr)
                    .reduce((acc: number, l: any) => acc + (l.hours || 0), 0);
                  return (
                    <td
                      key={day.dateStr}
                      className={`worklogs__grid-td worklogs__grid-td--footer-day ${day.dateStr === selectedDate ? 'worklogs__grid-col--active' : ''}`}
                    >
                      {dayTotal > 0 ? (
                        <span className="worklogs__grid-footer-val">{dayTotal.toFixed(1)}h</span>
                      ) : (
                        <span className="worklogs__grid-dash">–</span>
                      )}
                    </td>
                  );
                })}
                <td className="worklogs__grid-td worklogs__grid-td--footer-total">
                  <span className="worklogs__grid-footer-grand">{totalHours.toFixed(1)}h</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {showDrawer && (
        <LogTaskDrawer
          editingLog={editingLog}
          defaultDate={selectedDate}
          isReadOnly={isReadOnlyDrawer}
          onClose={() => {
            setShowDrawer(false);
            setEditingLog(null);
          }}
        />
      )}

      {viewDescLog && (
        <TaskDescriptionModal
          log={viewDescLog}
          onClose={() => setViewDescLog(null)}
        />
      )}

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

