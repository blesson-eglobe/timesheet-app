import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { fireEasterEggByWord } from './EasterEgg';

// Inject pulse keyframe once
const KEYFRAME_ID = 'ee-hint-pulse-style';
function ensureHintKeyframe() {
  if (document.getElementById(KEYFRAME_ID)) return;
  const s = document.createElement('style');
  s.id = KEYFRAME_ID;
  s.textContent = `
    @keyframes ee-hint-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.35; transform: scale(0.65); }
    }
    @keyframes ee-tooltip-in {
      from { opacity: 0; transform: translateX(-50%) translateY(6px); }
      to   { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(s);
}

interface SearchModalProps {
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const { role } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => { ensureHintKeyframe(); }, []);

  const allItems = [
    {
      label: 'Go to Dashboard',
      category: 'Page',
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg>,
      action: () => { navigate('/'); onClose(); }
    },
    {
      label: 'Log Time Today / Work Logs',
      category: 'Action',
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6.5"/><path d="M8 4.5V8l2.5 2"/></svg>,
      action: () => { navigate('/work-logs'); onClose(); }
    },
    {
      label: 'View All Projects',
      category: 'Projects',
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 4.5A1.5 1.5 0 013 3h3.5l1.5 1.5H13A1.5 1.5 0 0114.5 6v6A1.5 1.5 0 0113 13.5H3A1.5 1.5 0 011.5 12V4.5z"/></svg>,
      action: () => { navigate('/projects'); onClose(); }
    },
    ...(role !== 'admin' ? [{
      label: 'Pending Approvals',
      category: 'Approvals',
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 4L6 12l-4-4"/><rect x="1.5" y="1.5" width="13" height="13" rx="2"/></svg>,
      action: () => { navigate('/approvals'); onClose(); }
    }] : []),
    {
      label: 'Reports & Analytics Export Center',
      category: 'Reports',
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 14V8m4 6V2m4 12V5"/></svg>,
      action: () => { navigate('/reports'); onClose(); }
    },
    {
      label: 'Employee Directory',
      category: 'People',
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 13v-1a3 3 0 00-3-3H5a3 3 0 00-3 3v1"/><circle cx="6.5" cy="5" r="2.5"/></svg>,
      action: () => { navigate('/employees'); onClose(); }
    },
    {
      label: 'Account & Profile Settings',
      category: 'Settings',
      icon: <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.5"/><path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85"/></svg>,
      action: () => { navigate('/settings'); onClose(); }
    }
  ];

  const filteredItems = allItems.filter(item =>
    item.label.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => { setSelectedIndex(0); }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].action();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, filteredItems, selectedIndex]);

  return ReactDOM.createPortal(
        <div className="search-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
          <div className="search-modal">
            <div className="search-modal__header">
              <svg viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5" width="18" height="18">
                <circle cx="6.5" cy="6.5" r="4.5"/><path d="M10.5 10.5L14 14"/>
              </svg>
              <input
                ref={inputRef}
                placeholder="Search pages, projects, people..."
                value={query}
                onChange={e => {
                  const val = e.target.value;
                  setQuery(val);
                  if (fireEasterEggByWord(val.trim())) {
                    setQuery('');
                  }
                }}
              />
              <span className="search-modal__esc">Esc</span>
            </div>
            <div className="search-modal__body">
              <div className="search-modal__section-title">
                {query ? `RESULTS FOR "${query.toUpperCase()}"` : 'QUICK NAVIGATION'}
              </div>
              {filteredItems.length === 0 ? (
                <div className="search-modal__empty">
                  No matching pages or actions found.
                </div>
              ) : (
                filteredItems.map((item, idx) => (
                  <div
                    key={idx}
                    className={`search-modal__item${idx === selectedIndex ? ' search-modal__item--active' : ''}`}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(idx)}
                  >
                    <div className="search-modal__item-icon">{item.icon}</div>
                    <span className="search-modal__item-label">{item.label}</span>
                    <svg className="search-modal__item-arrow" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.5"><path d="M6 12l4-4-4-4"/></svg>
                  </div>
                ))
              )}
            </div>

            {/* Easter egg hint footer — expands on hover to reveal secrets */}

          </div>
        </div>,
    document.body
  );
};
