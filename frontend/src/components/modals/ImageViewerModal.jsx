import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/solid';

const ImageViewerModal = ({ src, alt, onClose }) => {
  if (!src) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="relative"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={src}
            alt={alt}
            className="rounded-lg shadow-2xl max-w-[90vw] max-h-[90vh]"
          />
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 bg-white rounded-full p-1 text-gray-700 hover:text-black transition-colors"
            aria-label="Close image viewer"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageViewerModal; 