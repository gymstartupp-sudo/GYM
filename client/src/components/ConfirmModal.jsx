import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onCancel, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
            style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(234,179,8,0.12)', border: danger ? '1px solid rgba(239,68,68,0.25)' : '1px solid rgba(234,179,8,0.25)' }}
          >
            <AlertTriangle size={30} className={danger ? 'text-red-400' : 'text-yellow-400'} />
          </div>

          <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>

          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>

          <div className="w-full border-t mb-6" style={{ borderColor: 'var(--border-color)' }} />

          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-5 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--bg-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              {cancelLabel}
            </button>

            <button
              onClick={onConfirm}
              className="flex-1 py-2.5 px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
              style={danger ? {
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
              } : {
                background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                color: '#000000',
                boxShadow: '0 4px 14px rgba(234,179,8,0.35)',
              }}
              onMouseEnter={(e) => {
                if (danger) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                } else {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ca8a04, #a16207)';
                }
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                if (danger) {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                } else {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #eab308, #ca8a04)';
                }
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
