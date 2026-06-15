import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, X, AlertTriangle } from 'lucide-react';

/**
 * LogoutModal — Professional confirmation modal for logout action.
 * Replaces all browser alert/confirm popups.
 *
 * Props:
 *   isOpen     — boolean to control visibility
 *   onCancel   — function called when Cancel is clicked (or backdrop clicked)
 *   onConfirm  — function called when Logout is confirmed
 */
const LogoutModal = ({ isOpen, onCancel, onConfirm }) => {
  // Trap body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Close on Escape key
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
      aria-labelledby="logout-modal-title"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border shadow-2xl animate-in fade-in zoom-in-95 duration-200"
        style={{
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-color)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close (X) button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all duration-200"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Modal Body */}
        <div className="p-8 flex flex-col items-center text-center">
          {/* Icon */}
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <AlertTriangle size={30} className="text-red-400" />
          </div>

          {/* Title */}
          <h2
            id="logout-modal-title"
            className="text-xl font-bold mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Logout Confirmation
          </h2>

          {/* Message */}
          <p className="text-sm leading-relaxed mb-8" style={{ color: 'var(--text-secondary)' }}>
            Are you sure you want to logout from your account?
          </p>

          {/* Divider */}
          <div className="w-full border-t mb-6" style={{ borderColor: 'var(--border-color)' }} />

          {/* Buttons */}
          <div className="flex gap-3 w-full">
            {/* Cancel */}
            <button
              id="logout-cancel-btn"
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
              Cancel
            </button>

            {/* Logout */}
            <button
              id="logout-confirm-btn"
              onClick={onConfirm}
              className="flex-1 py-2.5 px-5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626, #b91c1c)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(239,68,68,0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.35)';
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LogoutModal;
