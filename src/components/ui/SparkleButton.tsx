import React, { useState, useEffect } from 'react';
import { fireEasterEgg } from './EasterEgg';

interface SparkleButtonProps {
  onOpenSearch?: () => void;
}

const QUIRKY_MESSAGES = [
  { icon: '✨', line1: 'Magic Portal Activated!', line2: 'You found the secret sparkle button! 🚀' },
  { icon: '☕', line1: 'Instant Espresso Injection!', line2: '+500% speed typing timesheets ⚡' },
  { icon: '🍕', line1: 'Pizza Radar Online!', line2: 'Searching for free office snacks... 🍕' },
  { icon: '🕹️', line1: 'Retro Arcade Mode!', line2: 'Try typing "konami" on your keyboard!' },
  { icon: '🔐', line1: 'Sudo Approval Granted!', line2: '...just kidding, ask your manager 😄' },
  { icon: '🤙', line1: 'YOLO Mode Engaged!', line2: 'Remember to submit timesheets on time!' },
];

export const SparkleButton: React.FC<SparkleButtonProps> = ({ onOpenSearch }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  // Keyframes injection for tooltip & signal animation
  useEffect(() => {
    const styleId = 'sparkle-button-styles';
    if (!document.getElementById(styleId)) {
      const styleEl = document.createElement('style');
      styleEl.id = styleId;
      styleEl.textContent = `
        @keyframes sparkle-radar-ping {
          0% { transform: scale(0.8); opacity: 1; }
          100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes sparkle-tooltip-pop {
          0% { opacity: 0; transform: translateX(-50%) translateY(8px) scale(0.94); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `;
      document.head.appendChild(styleEl);
    }
  }, []);

  const handleClick = () => {
    setIsClicking(true);
    setTimeout(() => setIsClicking(false), 300);

    // Pick a random fun easter egg message
    const randomEgg = QUIRKY_MESSAGES[Math.floor(Math.random() * QUIRKY_MESSAGES.length)];
    fireEasterEgg(randomEgg.icon, randomEgg.line1, randomEgg.line2);

    if (onOpenSearch) {
      setTimeout(() => {
        onOpenSearch();
      }, 350);
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label="Secret Exciting Sparkle Button"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '1px solid #e2e8f0',
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          outline: 'none',
          padding: 0,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isClicking ? 'scale(0.88)' : (showTooltip ? 'scale(1.08)' : 'scale(1)'),
          borderColor: showTooltip ? '#8b5cf6' : '#e2e8f0',
        }}
      >
        {/* 4-point star SVG matching user screenshot */}
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          style={{
            width: 14,
            height: 14,
            color: showTooltip ? '#8b5cf6' : '#64748b',
            transition: 'color 0.2s ease, transform 0.3s ease',
            transform: showTooltip ? 'rotate(45deg) scale(1.15)' : 'rotate(0deg)',
          }}
        >
          <path d="M12 2L13.8 8.2L20 10L13.8 11.8L12 18L10.2 11.8L4 10L10.2 8.2Z" />
        </svg>
      </button>

      {/* Quirky Custom Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            animation: 'sparkle-tooltip-pop 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            pointerEvents: 'none',
          }}
        >
          {/* Tooltip Arrow */}
          <div
            style={{
              position: 'absolute',
              top: -5,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 10,
              height: 10,
              background: '#0f172a',
              borderTop: '1px solid rgba(139, 92, 246, 0.4)',
              borderLeft: '1px solid rgba(139, 92, 246, 0.4)',
            }}
          />

          {/* Tooltip Body */}
          <div
            style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              border: '1px solid rgba(139, 92, 246, 0.4)',
              borderRadius: 12,
              padding: '10px 14px',
              color: '#ffffff',
              boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.4), 0 0 15px rgba(139, 92, 246, 0.25)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            {/* Signal Indicator & Quirky Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: '#c084fc', letterSpacing: '0.04em' }}>
              <span
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: '#a855f7',
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    inset: -2,
                    borderRadius: '50%',
                    border: '1px solid #c084fc',
                    animation: 'sparkle-radar-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite',
                  }}
                />
              </span>
              <span>QUIRKY SIGNAL DETECTED 📡</span>
            </div>

            {/* Exciting Message */}
            <div style={{ fontSize: 12, fontWeight: 500, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✨ Click here for something exciting!</span>
              <span style={{ fontSize: 10, background: '#3b0764', color: '#e9d5ff', padding: '2px 6px', borderRadius: 6, fontWeight: 600, border: '1px solid #7e22ce' }}>
                SECRET
              </span>
            </div>

            <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 }}>
              Hint: Unlocks hidden magic, easter eggs & shortcuts 🤫
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
