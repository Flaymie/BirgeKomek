import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import { useAuth } from '../../context/AuthContext';

const UserMenu = () => {
  const { currentUser, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  
  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };
  
  // Закрываем меню при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  const handleLogout = () => {
    logout();
    setIsOpen(false);
  };
  
  if (!currentUser) return null;
  
  return (
    <div className="relative" ref={menuRef}>
      <UserAvatar onClick={toggleMenu} />
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{currentUser.username}</p>
            <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
          </div>
          
          <Link 
            to="/profile" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Профиль
          </Link>
          
          <Link 
            to="/my-requests" 
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            Мои запросы
          </Link>
          
          {currentUser.role === 'admin' && (
            <Link 
              to="/admin" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Панель администратора
            </Link>
          )}
          
          <button
            onClick={handleLogout}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
          >
            Выйти
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu; 