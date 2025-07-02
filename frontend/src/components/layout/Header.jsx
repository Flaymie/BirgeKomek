"use client"
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import { formatAvatarUrl } from '../../services/avatarUtils';
import { FiMenu, FiX, FiUser, FiLogOut, FiGrid, FiMessageSquare, FiSettings, FiInfo } from 'react-icons/fi';
import { BellIcon } from '@heroicons/react/24/outline';

const Username = ({ user }) => {
  if (!user) return null;
  return (
    <span className="font-bold text-gray-800 truncate">
      {user.username}
    </span>
  );
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);
  
  const handleLogout = async (e) => {
    e.preventDefault();
    try {
      await logout();
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    }
  };
  
  const isActive = (path) => {
    return location.pathname === path 
      ? 'text-primary-600 font-semibold' 
      : 'text-gray-600 hover:text-primary-600';
  };

  const NavLinks = ({ isMobile = false }) => (
    <nav className={isMobile 
        ? "flex flex-col space-y-4 pt-4" 
        : "hidden md:flex items-center space-x-6"
    }>
        <Link to="/requests" className={`text-base transition-colors duration-300 ${isActive('/requests')}`}>
          Заявки
        </Link>
        <Link to="/about" className={`text-base transition-colors duration-300 ${isActive('/about')}`}>
          О нас
        </Link>
    </nav>
  );

  const AuthNav = ({ isMobile = false }) => {
    if (currentUser) {
      const isPrivileged = currentUser.roles?.admin || currentUser.roles?.moderator;
      
      // --- КОСТЫЛЬ ДЛЯ ДИНАМИЧЕСКОЙ ССЫЛКИ ---
      const location = useLocation();
      const chatPageMatch = location.pathname.match(/^\/requests\/(.+)\/chat$/);
      const requestId = chatPageMatch ? chatPageMatch[1] : null;

      return (
        <div className={isMobile ? "pt-4 border-t border-gray-200" : "flex items-center gap-4"}>
            {/* Для десктопа - полноценный компонент с дропдауном. 
                Показываем только если isMobile = false. 
                В мобильном меню этот блок будет скрыт целиком.
            */}
            {!isMobile && <NotificationBell />}

            {/* В мобильном меню (isMobile=true) показываем только ссылку */}
            {isMobile && (
              <Link to="/notifications" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md">
                <div className="relative">
                  <BellIcon className="h-6 w-6" />
                  {currentUser.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                      <span>{currentUser.unreadCount > 9 ? '9+' : currentUser.unreadCount}</span>
                    </span>
                  )}
                </div>
                Уведомления
              </Link>
            )}
            
            <div className="relative group">
                <Link to="/profile" className="flex items-center gap-2 cursor-pointer">
                    <img 
                      src={formatAvatarUrl(currentUser)}
                      alt={currentUser.username}
                      className="w-9 h-9 rounded-full object-cover border-2 border-transparent group-hover:border-primary-500 transition-colors"
                    />
                </Link>
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right p-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <Username user={currentUser} />
                    </div>
                    <div className="py-2">
                        <Link to="/profile" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md">
                           <FiUser className="w-4 h-4" /> Профиль
                        </Link>
                        <Link to="/chats" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md">
                           <FiMessageSquare className="w-4 h-4" /> Чаты
                        </Link>
                        <Link to="/my-requests" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md">
                           <FiGrid className="w-4 h-4" /> Мои заявки
                        </Link>
                        {/* --- ВОТ И ОНА, НАША ССЫЛКА --- */}
                        {requestId && (
                           <Link to={`/requests/${requestId}`} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md">
                              <FiInfo className="w-4 h-4" /> Детали этой заявки
                           </Link>
                        )}
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                        <button 
                          onClick={handleLogout}
                          className="flex items-center gap-3 w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <FiLogOut className="w-4 h-4" /> Выйти
                        </button>
                    </div>
                </div>
            </div>
        </div>
      );
    }
    return (
        <div className={isMobile ? "flex flex-col space-y-3 pt-4 border-t border-gray-200" : "hidden md:flex items-center space-x-2"}>
             <Link to="/login" className="btn btn-secondary-outline">
                Войти
             </Link>
             <Link to="/register" className="btn btn-primary">
                Регистрация
            </Link>
        </div>
    );
  };
  
  return (
    <header className={`sticky top-0 w-full z-30 transition-all duration-300 ${isScrolled ? 'bg-white/95 shadow-md backdrop-blur-sm' : 'bg-white'}`}>
      <div className="container-custom">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-3">
            <img src="/img/logo.png" alt="Бірге Көмек" className="w-10 h-10" />
            <span className="text-xl font-bold text-gray-800 hidden sm:block">Бірге Көмек</span>
          </Link>
          
          <NavLinks />
          
          <div className="flex items-center gap-4">
             <AuthNav />
             <button 
                className="md:hidden text-gray-600 hover:text-primary-600"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
              </button>
          </div>
        </div>
        
        {/* Мобильное меню */}
        <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isMenuOpen ? 'max-h-screen opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
          <NavLinks isMobile />
          <AuthNav isMobile />
        </div>
      </div>
    </header>
  );
};

export default Header; 