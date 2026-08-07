import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading…',
  size = 'md',
  fullPage = false,
}) => {
  const dimension = size === 'sm' ? 24 : size === 'lg' ? 48 : 36;
  const borderSize = size === 'sm' ? 3 : size === 'lg' ? 4 : 3.5;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: fullPage ? '80px 20px' : '48px 20px',
        gap: 14,
        width: '100%',
        minHeight: fullPage ? '50vh' : '200px',
      }}
    >
      <div
        style={{
          width: dimension,
          height: dimension,
          borderRadius: '50%',
          border: `${borderSize}px solid #e2e8f0`,
          borderTopColor: '#2563eb',
          borderRightColor: '#3b82f6',
          animation: 'spin 0.75s linear infinite',
        }}
      />
      {message && (
        <span
          style={{
            fontSize: size === 'sm' ? 12 : 14,
            fontWeight: 500,
            color: '#64748b',
            letterSpacing: '0.01em',
          }}
        >
          {message}
        </span>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
