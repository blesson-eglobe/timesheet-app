import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAppStore } from '../../store/useAppStore';
import { EasterEgg } from '../ui/EasterEgg';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/work-logs':  'Work Logs',
  '/projects':   'Projects',
  '/employees':  'Employees',
  '/approvals':  'Approvals',
  '/reports':    'Reports',
  '/settings':   'Settings',
};

export const AppLayout: React.FC = () => {
  const { pathname } = useLocation();
  const { isSidebarCollapsed, toggleSidebar } = useAppStore();

  const getTitle = () => {
    if (pathname.startsWith('/projects/')) return 'Projects';
    return PAGE_TITLES[pathname] ?? 'Dashboard';
  };

  return (
    <div className="app-shell">
      <EasterEgg />
      <Sidebar />
      {!isSidebarCollapsed && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={toggleSidebar}
          aria-label="Close navigation overlay"
        />
      )}
      <div className="main-area" style={{ position: 'relative' }}>
        <Topbar title={getTitle()} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
