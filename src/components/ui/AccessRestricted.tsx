import React from 'react';

interface AccessRestrictedProps {
  title?: string;
  message?: string;
}

export const AccessRestricted: React.FC<AccessRestrictedProps> = ({
  title = 'Access Restricted',
  message = 'You do not have permission to access this section. Please contact your administrator if you believe this is an error.'
}) => {
  return (
    <div className="page-inner" style={{ padding: 60, textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{title}</h2>
      <p style={{ color: '#6b7280', maxWidth: 420, margin: '0 auto', fontSize: 14 }}>
        {message}
      </p>
    </div>
  );
};
