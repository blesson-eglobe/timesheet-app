import React, { useState, useEffect, useRef, useCallback } from 'react';

// ─── Toast type ───────────────────────────────────────────────────────────────
interface ToastItem {
  id: number;
  icon: string;
  line1: string;
  line2?: string;
}

// ─── Egg definitions ──────────────────────────────────────────────────────────
interface Egg {
  word: string;
  icon: string;
  line1: string;
  line2?: string;
  isRetro?: boolean;
}

const EGGS: Egg[] = [
  {
    word: 'sudo approval',
    icon: '🔐',
    line1: 'Nice try, Mr. Root 😄',
    line2: 'Sudo powers not included in your plan.',
  },
  {
    word: 'sudo approve',
    icon: '🔐',
    line1: 'Access denied 😄',
    line2: 'Try: sudo approval — you\'ll love it.',
  },
  {
    word: 'coffee',
    icon: '☕',
    line1: 'Productivity +10%',
    line2: 'Based on absolutely no science.',
  },
  {
    word: 'pizza',
    icon: '🍕',
    line1: 'Best idea you\'ve had today.',
    line2: 'Timesheet tip: log it under "Team Morale".',
  },
  {
    word: 'yolo',
    icon: '🤙',
    line1: 'YOLO Mode: Activated',
    line2: 'Please still fill in your timesheets.',
  },
  {
    word: 'konami',
    icon: '🕹️',
    line1: '',  // handled by retro toggle
    isRetro: true,
  },
];

const MAX_LEN = Math.max(...EGGS.map(e => e.word.length)); // 'sudo approval' = 13

// ─── Global trigger so SearchModal can fire eggs from inside an input ─────────
type EggTriggerFn = (icon: string, line1: string, line2?: string) => void;
let _globalEggTrigger: EggTriggerFn | null = null;
export function fireEasterEgg(icon: string, line1: string, line2?: string) {
  _globalEggTrigger?.(icon, line1, line2);
}
export function fireEasterEggByWord(input: string): boolean {
  const lower = input.toLowerCase().trim();
  for (const egg of EGGS) {
    if (lower === egg.word || lower.endsWith(egg.word)) {
      if (!egg.isRetro) {
        fireEasterEgg(egg.icon, egg.line1, egg.line2);
      }
      return true;
    }
  }
  return false;
}

// ─── Component ────────────────────────────────────────────────────────────────
export const EasterEgg: React.FC = () => {
  const [toasts, setToasts]   = useState<ToastItem[]>([]);
  const [retro, setRetro]     = useState(false);
  const bufferRef             = useRef('');
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef                 = useRef(0);

  // ── Apply / remove retro class on <body> ───────────────────────────────────
  useEffect(() => {
    document.body.classList.toggle('retro-mode', retro);
    return () => document.body.classList.remove('retro-mode');
  }, [retro]);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const addToast = useCallback((icon: string, line1: string, line2?: string) => {
    const id = ++idRef.current;
    setToasts(p => [...p, { id, icon, line1, line2 }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3800);
  }, []);

  // ── Register global trigger ────────────────────────────────────────────────
  useEffect(() => {
    _globalEggTrigger = addToast;
    return () => { _globalEggTrigger = null; };
  }, [addToast]);

  // ── Retro toggle ───────────────────────────────────────────────────────────
  const triggerRetro = useCallback(() => {
    setRetro(prev => {
      const next = !prev;
      setTimeout(() => {
        if (next) {
          addToast('🕹️', 'Retro Mode: ON', 'Welcome to 1985.');
        } else {
          addToast('🖥️', 'Retro Mode: OFF', 'Back to the future.');
        }
      }, 0);
      return next;
    });
  }, [addToast]);

  // ── Global keydown listener ────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in form fields
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;

      // Accept printable chars + space
      const ch = e.key === ' ' ? ' ' : (e.key.length === 1 ? e.key.toLowerCase() : null);
      if (ch === null) return;

      bufferRef.current = (bufferRef.current + ch).slice(-MAX_LEN);

      for (const egg of EGGS) {
        if (bufferRef.current.endsWith(egg.word)) {
          bufferRef.current = '';
          if (egg.isRetro) {
            triggerRetro();
          } else {
            addToast(egg.icon, egg.line1, egg.line2);
          }
          break;
        }
      }

      // Reset buffer on 2.5 s inactivity
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => { bufferRef.current = ''; }, 2500);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [addToast, triggerRetro]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Toast stack */}
      {toasts.length > 0 && (
        <div className="ee-toasts" aria-live="polite">
          {toasts.map(t => (
            <div key={t.id} className="ee-toast">
              <span className="ee-toast__icon">{t.icon}</span>
              <div className="ee-toast__body">
                <div className="ee-toast__line1">{t.line1}</div>
                {t.line2 && <div className="ee-toast__line2">{t.line2}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retro mode badge */}
      {retro && (
        <div className="ee-retro-badge" title="Type 'konami' to toggle off">
          🕹️ Retro Mode
        </div>
      )}
    </>
  );
};
