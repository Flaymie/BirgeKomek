"use client"
import React, { useState, useEffect, Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import { formatAvatarUrl } from '../../services/avatarUtils';
import { FiMenu, FiX, FiUser, FiLogOut, FiGrid, FiMessageSquare, FiInfo, FiHelpCircle } from 'react-icons/fi';
import { AnimatePresence, motion } from 'framer-motion';

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
  
  // --- КОСТЫЛЬ ДЛЯ ДИНАМИЧЕСКОЙ ССЫЛКИ ---
  const chatPageMatch = location.pathname.match(/^\/requests\/(.+)\/chat$/);
  const requestId = chatPageMatch ? chatPageMatch[1] : null;
  
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
      ? 'text-indigo-600 font-semibold' 
      : 'text-gray-700 hover:text-indigo-600';
  };

  const NavLinks = ({ isMobile = false }) => {
    if (isMobile) return <Fragment />;

    return (
        <nav className="hidden md:flex items-center space-x-8">
            <Link to="/requests" className={`text-base font-medium transition-colors duration-300 ${isActive('/requests')}`}>
              Заявки
            </Link>
            <Link to="/about" className={`text-base font-medium transition-colors duration-300 ${isActive('/about')}`}>
              О нас
            </Link>
        </nav>
    );
  };

  const AuthNav = ({ isMobile = false }) => {
    if (isMobile) return <Fragment />;

    if (currentUser) {
      return (
        <div className="relative group">
            {!isMobile && <NotificationBell />}

            {isMobile && (
              <Link to="/notifications" className="flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-primary-600 rounded-md">
                <div className="relative">
                  <FiHelpCircle className="h-6 w-6" />
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
        <div className="hidden md:flex items-center space-x-2">
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
    <>
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
                className="md:hidden text-gray-600 hover:text-indigo-600"
                onClick={() => setIsMenuOpen(true)}
              >
                <FiMenu size={24} />
              </button>
          </div>
        </div>
      </div>
    </header>

    <AnimatePresence>
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-xl p-6 flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-4 border-b border-gray-200">
              <span className="text-lg font-bold text-gray-800">Меню</span>
              <button onClick={() => setIsMenuOpen(false)} className="p-1 text-gray-500 hover:text-gray-800">
                <FiX size={24} />
              </button>
            </div>
            
            <nav className="flex-grow mt-8 flex flex-col space-y-2">
              <Link to="/requests" className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${isActive('/requests')}`}>
                <FiGrid className="w-6 h-6" /> Заявки
              </Link>
              <Link to="/about" className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${isActive('/about')}`}>
                <FiHelpCircle className="w-6 h-6" /> О нас
              </Link>

              {currentUser && (
                <>
                  <div className="pt-4 mt-4 border-t border-gray-200" />
                  <Link to="/profile" className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${isActive('/profile')}`}>
                    <FiUser className="w-6 h-6" /> Профиль
                  </Link>
                  <Link to="/chats" className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${isActive('/chats')}`}>
                    <FiMessageSquare className="w-6 h-6" /> Чаты
                  </Link>
                   <Link to="/my-requests" className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${isActive('/my-requests')}`}>
                     <FiGrid className="w-6 h-6" /> Мои заявки
                   </Link>
                   {requestId && (
                     <Link to={`/requests/${requestId}`} className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${isActive(`/requests/${requestId}`)}`}>
                        <FiInfo className="w-6 h-6" /> Детали заявки
                     </Link>
                  )}
                </>
              )}
            </nav>

            <div className="mt-auto">
              {currentUser ? (
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 text-lg text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"
                >
                  <FiLogOut className="w-6 h-6" /> Выйти
                </button>
              ) : (
                <div className="flex flex-col space-y-3">
                  <Link to="/login" className="btn btn-secondary-outline w-full py-3 text-lg">
                      Войти
                  </Link>
                  <Link to="/register" className="btn btn-primary w-full py-3 text-lg">
                      Регистрация
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
};

export default Header; 