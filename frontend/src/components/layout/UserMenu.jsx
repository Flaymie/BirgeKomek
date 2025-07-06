import React, { useState, useRef, useEffect, Fragment } from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from './UserAvatar';
import { useAuth } from '../../context/AuthContext';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import LanguageSwitcher from '../shared/LanguageSwitcher';

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
    <div className="relative inline-block text-left" ref={menuRef}>
      <Menu as="div" className="relative">
        <Menu.Button className="flex items-center gap-2 rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <UserAvatar user={currentUser} size="10" />
          <div className="hidden md:block text-left">
            <p className="font-semibold text-sm text-gray-800 truncate max-w-[120px]">{currentUser.username}</p>
          </div>
          <ChevronDownIcon className="hidden md:block h-5 w-5 text-gray-500" />
        </Menu.Button>
        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="px-1 py-1 ">
              <div className="px-4 py-3">
                <p className="text-sm font-semibold">Вошли как</p>
                <p className="truncate text-sm font-medium text-gray-900">{currentUser.username}</p>
              </div>
            </div>

            {/* Секция смены языка */}
            <div className="px-1 py-1">
              <LanguageSwitcher />
            </div>

            <div className="px-1 py-1">
              <Menu.Item>
                {({ active }) => (
                  <Link
                    to="/profile"
                    className={`${active ? 'bg-gray-100' : ''} block px-4 py-2 text-sm text-gray-700`}
                    onClick={() => setIsOpen(false)}
                  >
                    Профиль
                  </Link>
                )}
              </Menu.Item>
              <Menu.Item>
                {({ active }) => (
                  <Link
                    to="/my-requests"
                    className={`${active ? 'bg-gray-100' : ''} block px-4 py-2 text-sm text-gray-700`}
                     onClick={() => setIsOpen(false)}
                  >
                    Мои запросы
                  </Link>
                )}
              </Menu.Item>
            </div>
            
            {currentUser.role === 'admin' && (
              <div className="px-1 py-1">
                <Menu.Item>
                  {({ active }) => (
                    <Link
                      to="/admin"
                      className={`${active ? 'bg-gray-100' : ''} block px-4 py-2 text-sm text-gray-700`}
                       onClick={() => setIsOpen(false)}
                    >
                      Панель администратора
                    </Link>
                  )}
                </Menu.Item>
              </div>
            )}
            <div className="px-1 py-1">
              <Menu.Item>
                {({ active }) => (
                  <button
                    onClick={handleLogout}
                    className={`${active ? 'bg-gray-100' : ''} block w-full text-left px-4 py-2 text-sm text-red-600`}
                  >
                    Выйти
                  </button>
                )}
              </Menu.Item>
            </div>
          </Menu.Items>
        </Transition>
      </Menu>
    </div>
  );
};

export default UserMenu; 