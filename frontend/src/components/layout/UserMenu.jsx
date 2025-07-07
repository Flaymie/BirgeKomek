import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { Menu } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';

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
    <div className="relative inline-block text-left">
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center gap-2 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <UserAvatar user={currentUser} size="10" />
          <div className="hidden md:block text-left">
            <p className="font-semibold text-sm text-gray-800 truncate max-w-[120px]">{currentUser.username}</p>
          </div>
          <ChevronDownIcon className="hidden md:block h-5 w-5 text-gray-500" />
        </Menu.Button>
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <div className="px-1 py-1 ">
            <div className="px-4 py-3">
              <p className="text-sm font-semibold">Вошли как</p>
              <p className="truncate text-sm font-medium text-gray-900">{currentUser.username}</p>
            </div>
          </div>
          <div className="px-1 py-1">
            <Link 
              to="/profile" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Профиль
            </Link>
          </div>
          <div className="px-1 py-1">
            <Link 
              to="/my-requests" 
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Мои запросы
            </Link>
          </div>
          {currentUser.roles?.admin && (
            <div className="px-1 py-1">
              <Link 
                to="/admin" 
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Панель администратора
              </Link>
            </div>
          )}
          <div className="px-1 py-1">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
            >
              Выйти
            </button>
          </div>
        </Menu.Items>
      </Menu>
    </div>
  );
};

export default UserMenu; 