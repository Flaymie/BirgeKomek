import React from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';

const ImageViewerModal = ({ src, alt, onClose }) => {
  if (!src) return null;

  return (
    <Modal isOpen={!!src} onClose={onClose}>
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        className="w-screen h-screen flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative max-w-[90vw] max-h-[85vh]">
          <img
            src={src}
            alt={alt}
            className="block rounded-lg shadow-2xl max-w-[90vw] max-h-[85vh] object-contain"
          />
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 bg-white rounded-full p-2 shadow-lg text-gray-700 hover:text-black hover:bg-gray-100 transition-colors z-10"
            aria-label="Close image viewer"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
      </motion.div>
    </Modal>
  );
};

export default ImageViewerModal; 
