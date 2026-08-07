import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useApprovals } from '../../hooks/useApprovals';
import { Avatar } from '../ui/Avatar';

const IconDashboard = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/>
    <rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>
  </svg>
);
const IconClock = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 2"/>
  </svg>
);
const IconFolder = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1.5 4.5A1.5 1.5 0 013 3h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 6v6A1.5 1.5 0 0113 13.5H3A1.5 1.5 0 011.5 12V4.5z"/>
  </svg>
);
const IconUsers = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M11 13v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1"/><circle cx="6.5" cy="5" r="2.5"/>
    <path d="M14 13v-1a3 3 0 00-2-2.83"/><path d="M10.5 2.17A2.5 2.5 0 0112.5 4.5"/>
  </svg>
);
const IconCheck = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 8l4 4 7-7"/>
  </svg>
);
const IconChart = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M1.5 12.5L5 8l3.5 3L12 5l3 2"/>
    <path d="M1.5 14.5h13"/>
  </svg>
);
const IconSettings = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="2.5"/>
    <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85"/>
  </svg>
);

interface NavItemDef {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const { role, currentUser, isSidebarCollapsed, toggleSidebar } = useAppStore();
  const navigate = useNavigate();
  const { data: approvals = [] } = useApprovals();
  const isElevatedRole = role === 'manager' || role === 'admin' || role === 'hr' || role === 'ceo';
  const canViewApprovals = role === 'manager' || role === 'hr' || role === 'ceo';
  const canViewReports = true;
  const pendingApprovalsCount = canViewApprovals ? approvals.filter((a: { status: string }) => a.status === 'Pending').length : 0;

  const mainNav: NavItemDef[] = [
    { to: '/dashboard', icon: <IconDashboard />, label: 'Dashboard' },
    { to: '/work-logs',  icon: <IconClock />,    label: 'Work Logs' },
    { to: '/projects',   icon: <IconFolder />,   label: 'Projects' },
  ];

  const manageNav: NavItemDef[] = [
    ...(isElevatedRole ? [{ to: '/employees', icon: <IconUsers />, label: 'Employees' }] : []),
    ...(canViewApprovals ? [{ to: '/approvals', icon: <IconCheck />, label: 'Approvals', badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined }] : []),
    ...(canViewReports ? [{ to: '/reports',   icon: <IconChart />, label: 'Reports'   }] : []),
  ];


  const systemNav: NavItemDef[] = [
    { to: '/settings', icon: <IconSettings />, label: 'Settings' },
  ];

  return (
    <aside className={`sidebar${isSidebarCollapsed ? ' sidebar--collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar__logo">
        {!isSidebarCollapsed && (
          <div className="sidebar__logo-icon" style={{ background: '#111827', color: '#fff', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
        )}
        {!isSidebarCollapsed && <span className="sidebar__logo-name">eGlobe</span>}
        <div className="sidebar__logo-toggle" onClick={toggleSidebar} title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
            <rect x="1.75" y="2.75" width="12.5" height="10.5" rx="2" />
            <path d="M5.75 2.75v10.5" />
            {isSidebarCollapsed ? (
              <path d="M8.75 6l2.25 2.25-2.25 2.25" />
            ) : (
              <path d="M10.75 6L8.5 8.25l2.25 2.25" />
            )}
          </svg>
        </div>
      </div>

      {/* Nav — takes all available space and scrolls */}
      <nav className="sidebar__nav">
        <div className="sidebar__section-label">Main</div>
        {mainNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            title={isSidebarCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <span className="sidebar__nav-item-icon">{item.icon}</span>
            <span className="sidebar__nav-item-label">{item.label}</span>
            {item.badge && <span className="sidebar__nav-item-badge">{item.badge}</span>}
          </NavLink>
        ))}

        {manageNav.length > 0 && (
          <>
            <div className="sidebar__section-label">Manage</div>
            {manageNav.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                title={isSidebarCollapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
                }
              >
                <span className="sidebar__nav-item-icon">{item.icon}</span>
                <span className="sidebar__nav-item-label">{item.label}</span>
                {item.badge && <span className="sidebar__nav-item-badge">{item.badge}</span>}
              </NavLink>
            ))}
          </>
        )}

        <div className="sidebar__section-label">System</div>
        {systemNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            title={isSidebarCollapsed ? item.label : undefined}
            className={({ isActive }) =>
              `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
            }
          >
            <span className="sidebar__nav-item-icon">{item.icon}</span>
            <span className="sidebar__nav-item-label">{item.label}</span>
          </NavLink>
        ))}

      </nav>

      {/* Footer — user profile card */}
      <div className="sidebar__footer">
        <div 
          className="sidebar__user-card" 
          onClick={() => navigate('/settings')}
          title="Go to Settings"
        >
          <Avatar src={currentUser.avatar} initials={currentUser.initials} color={currentUser.color} size="md" />
          {!isSidebarCollapsed && (
            <div className="sidebar__user-info">
              <div className="sidebar__user-name">{currentUser.name}</div>
              <div className="sidebar__user-role">{currentUser.designation}</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
