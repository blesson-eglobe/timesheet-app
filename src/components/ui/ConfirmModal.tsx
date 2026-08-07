import React, { useState } from 'react';
import ReactDOM from 'react-dom';

interface ConfirmModalProps {
  title: string;
  message: string;
  type?: 'alert' | 'confirm' | 'prompt';
  /** When true (for reject flows), enforces meaningful input validation on the prompt */
  validatePrompt?: boolean;
  defaultValue?: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
}

/** Returns an error string if the value is empty, too short, or gibberish. */
function validateRejectionReason(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'A rejection reason is required.';
  if (trimmed.length < 15)
    return `Please provide more detail (${trimmed.length}/15 characters minimum).`;
  // Check at least 3 distinct letters — rejects things like "aaaaaaaaaaaaaaa"
  const distinctLetters = new Set(trimmed.toLowerCase().replace(/[^a-z]/g, '').split(''));
  if (distinctLetters.size < 3)
    return 'Reason appears to be gibberish. Please describe the issue clearly.';
  return null;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title,
  message,
  type = 'confirm',
  validatePrompt = false,
  defaultValue = '',
  placeholder = '',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const [touched, setTouched] = useState(false);

  const validationError =
    type === 'prompt' && validatePrompt ? validateRejectionReason(inputValue) : null;
  const isConfirmDisabled = type === 'prompt' && validatePrompt && validationError !== null;

  return ReactDOM.createPortal(
    <div className="confirm-modal__overlay">
      <div className="confirm-modal__panel">
        <div className="confirm-modal__body">
          <h3 className="confirm-modal__title">
            {title}
          </h3>
          <p className="confirm-modal__message">
            {message}
          </p>
          {type === 'prompt' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <textarea
                autoFocus
                value={inputValue}
                onChange={(e) => { setInputValue(e.target.value); setTouched(true); }}
                onBlur={() => setTouched(true)}
                placeholder={placeholder}
                rows={3}
                className={`confirm-modal__prompt-input${touched && validationError ? ' confirm-modal__prompt-input--error' : ''}`}
                style={{ resize: 'vertical' }}
              />
              {touched && validationError && (
                <div className="confirm-modal__prompt-error">
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 13, height: 13, flexShrink: 0 }}>
                    <circle cx="8" cy="8" r="6.25" />
                    <path d="M8 5v3M8 10.5h.01" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{validationError}</span>
                </div>
              )}
              {validatePrompt && (
                <div style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
                  {inputValue.trim().length} / 15 chars min
                </div>
              )}
            </div>
          )}
        </div>
        <div className="confirm-modal__footer">
          {type !== 'alert' && onCancel && (
            <button
              onClick={onCancel}
              type="button"
              className="confirm-modal__btn-cancel"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={() => {
              if (type === 'prompt' && validatePrompt) {
                setTouched(true);
                if (validationError) return;
              }
              onConfirm(type === 'prompt' ? inputValue : undefined);
            }}
            type="button"
            className="confirm-modal__btn-confirm"
            disabled={isConfirmDisabled}
            title={isConfirmDisabled && touched ? (validationError ?? undefined) : undefined}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
