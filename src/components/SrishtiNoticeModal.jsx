import React, { useEffect } from 'react';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX, FiArrowRight } from 'react-icons/fi';
import './SrishtiNoticeModal.css';

export default function SrishtiNoticeModal({
  isOpen,
  onClose,
  title = 'Notice',
  message = '',
  type = 'info', // 'info', 'warning', 'error', 'success'
  actionText = null,
  onAction = null,
  dismissText = 'Got It'
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return <FiCheckCircle size={32} />;
      case 'warning':
        return <FiAlertCircle size={32} />;
      case 'error':
        return <FiAlertCircle size={32} />;
      case 'info':
      default:
        return <FiInfo size={32} />;
    }
  };

  return (
    <div className="srishti-notice-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div 
        className="srishti-notice-card" 
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          type="button" 
          className="srishti-notice-close-btn" 
          onClick={onClose}
          aria-label="Close dialog"
        >
          <FiX size={18} />
        </button>

        <div className={`srishti-notice-icon-box ${type}`}>
          {renderIcon()}
        </div>

        <h3 className="srishti-notice-title">{title}</h3>
        <p className="srishti-notice-message">{message}</p>

        <div className="srishti-notice-actions">
          {actionText && onAction && (
            <button
              type="button"
              className="srishti-notice-btn srishti-notice-btn-primary"
              onClick={() => {
                onAction();
                onClose?.();
              }}
            >
              <span>{actionText}</span>
              <FiArrowRight size={16} />
            </button>
          )}

          <button
            type="button"
            className="srishti-notice-btn srishti-notice-btn-secondary"
            onClick={onClose}
          >
            {dismissText}
          </button>
        </div>
      </div>
    </div>
  );
}
