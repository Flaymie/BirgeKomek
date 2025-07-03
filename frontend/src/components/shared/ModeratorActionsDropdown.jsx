import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EllipsisVerticalIcon, ChatBubbleBottomCenterTextIcon } from '@heroicons/react/24/solid';
import { FaGavel, FaCheckCircle } from 'react-icons/fa';

const ModeratorActionsDropdown = ({ isBanned, onBan, onUnban, onNotify }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button className="p-2 text-gray-500 hover:text-gray-800 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
        <EllipsisVerticalIcon className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-20 origin-top-right"
          >
            <div className="py-1">
              <button
                onClick={onNotify}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-3"
              >
                <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-gray-500" />
                <span>Отправить уведомление</span>
              </button>

              <div className="border-t border-gray-100 my-1"></div>

              {isBanned ? (
                <button
                  onClick={onUnban}
                  className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-3"
                >
                  <FaCheckCircle className="h-5 w-5" />
                  <span>Разбанить</span>
                </button>
              ) : (
                <button
                  onClick={onBan}
                  className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center gap-3"
                >
                  <FaGavel className="h-5 w-5" />
                  <span>Забанить</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ModeratorActionsDropdown; 