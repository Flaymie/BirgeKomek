import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { SafeAnimatePresence, SafeMotionDiv } from '../shared/SafeMotion';
import useLockBodyScroll from '../../hooks/useLockBodyScroll';

const Modal = ({ isOpen, onClose, children }) => {
  useLockBodyScroll(isOpen);

  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(
    <SafeAnimatePresence mode="wait">
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <SafeMotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-10">
            {children}
          </div>
        </div>
      )}
    </SafeAnimatePresence>,
    document.body
  );
};

export default Modal;
