import React from 'react';
import ReactDOM from 'react-dom';

interface TaskDescriptionModalProps {
  log: {
    taskName: string;
    projectName?: string;
    taskDescription?: string;
    description?: string;
  } | null;
  onClose: () => void;
}

export const TaskDescriptionModal: React.FC<TaskDescriptionModalProps> = ({ log, onClose }) => {
  if (!log) return null;

  const rawDescription = log.taskDescription || log.description || '';
  const hasDescription = !!rawDescription.trim() && rawDescription !== '<p></p>';

  return ReactDOM.createPortal(
    <div
      className="modal-overlay task-desc-modal__overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal task-desc-modal__panel">
        {/* Header */}
        <div className="task-desc-modal__header">
          <div>
            <div className="task-desc-modal__title">
              Task Description
            </div>
            <div className="task-desc-modal__subtitle">
              {log.taskName} {log.projectName ? `• ${log.projectName}` : ''}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="task-desc-modal__close-btn"
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="task-desc-modal__body">
          {hasDescription ? (
            <div
              className="rich-text-content task-desc-modal__content"
              dangerouslySetInnerHTML={{ __html: rawDescription }}
            />
          ) : (
            <div className="task-desc-modal__empty">
              No description provided for this task.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="task-desc-modal__footer">
          <button
            type="button"
            className="btn btn--primary task-desc-modal__btn-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
