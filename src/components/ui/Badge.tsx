import React from 'react';

type BadgeVariant = 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'purple' | 'gray';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  outline?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'gray', dot = false, outline = false }) => (
  <span className={`badge badge--${variant}${dot ? ' badge--dot' : ''}${outline ? ' badge--outline' : ''}`}>
    {children}
  </span>
);

export const statusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'Active':       return 'green';
    case 'Approved':     return 'green';
    case 'On Track':     return 'green';
    case 'Completed':    return 'green';
    case 'Ongoing':      return 'blue';
    case 'Pending':      return 'yellow';
    case 'Submitted':    return 'blue';
    case 'In Progress':  return 'blue';
    case 'At Risk':      return 'orange';
    case 'Delayed':      return 'red';
    case 'Rejected':     return 'red';
    case 'On Leave':     return 'gray';
    case 'Not Started':  return 'gray';
    case 'High':         return 'red';
    case 'Medium':       return 'orange';
    case 'Low':          return 'blue';
    default:             return 'gray';
  }
};
