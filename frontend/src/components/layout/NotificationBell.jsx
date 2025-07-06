import React from 'react';
import { FiBell } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const NotificationBell = ({ count }) => {
  return (
    <Link to="/notifications" className="relative text-gray-600 hover:text-indigo-600 transition-colors duration-300">
      <FiBell size={24} />
      {count > 0 && (
        <div className="absolute -top-1 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white">
          {count > 9 ? '9+' : count}
        </div>
      )}
    </Link>
  );
};

export default NotificationBell; 