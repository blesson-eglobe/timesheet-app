import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: 'blue' | 'green' | 'orange' | 'red' | 'purple';
  thickness?: 'thin' | 'base' | 'thick';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max = 100, color = 'blue', thickness }) => {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const cls = `progress${thickness === 'thin' ? ' progress--thin' : thickness === 'thick' ? ' progress--thick' : ''}`;
  return (
    <div className={cls}>
      <div className={`progress__fill progress__fill--${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

interface UtilBarProps { value: number; }
export const UtilBar: React.FC<UtilBarProps> = ({ value }) => {
  const color = value >= 90 ? '#22c55e' : value >= 70 ? '#f97316' : '#ef4444';
  return (
    <div className="util-bar">
      <div className="util-bar__track">
        <div className="util-bar__fill" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="util-bar__label" style={{ color }}>{value}%</span>
    </div>
  );
};
