"use client"
import React, { useState, useEffect, Fragment } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import PushNotificationManager from '../common/PushNotificationManager';
import { formatAvatarUrl } from '../../services/avatarUtils';
import { FiMenu, FiX, FiUser, FiLogOut, FiGrid, FiMessageSquare, FiInfo, FiHelpCircle, FiBell, FiFlag, FiBarChart2, FiShield } from 'react-icons/fi';
import { AlertTriangle } from 'lucide-react';
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
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

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
      if (location.pathname === '/requests') {
        navigate('/login');
      }
    } catch (err) {
      console.error('Ошибка при выходе:', err);
    }
  };

  const isActive = (path) => {
    return location.pathname === path
      ? 'text-indigo-600 font-semibold relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-indigo-600 after:rounded-full'
      : 'text-gray-700 hover:text-indigo-600 transition-all duration-300 hover:scale-105';
  };

  const NavLinks = ({ isMobile = false }) => {
    if (isMobile) return <Fragment />;

    return (
      <nav className="hidden md:flex items-center space-x-8">
        <Link to="/requests" className={`text-base font-medium transition-all duration-300 pb-2 ${isActive('/requests')}`}>
          Заявки
        </Link>
        <Link to="/about" className={`text-base font-medium transition-all duration-300 pb-2 ${isActive('/about')}`}>
          О нас
        </Link>
      </nav>
    );
  };

  const AuthNav = ({ isMobile = false }) => {
    if (isMobile) return <Fragment />;

    if (currentUser) {
      return (
        <div className="hidden md:flex items-center gap-4">
          <PushNotificationManager />
          <NotificationBell />

          {/* Меню Панели Управления */}
          {(currentUser.roles?.admin || currentUser.roles?.moderator) && (
            <div className="relative group">
              <button className="flex items-center p-2 rounded-full text-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 transition-all duration-300 hover:scale-110 hover:shadow-lg">
                <FiShield className="w-5 h-5" />
              </button>
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right scale-95 group-hover:scale-100 p-3 z-50 border border-gray-100">
                <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg mb-2">
                  <span className="font-bold text-gray-800 text-sm">Панель управления</span>
                </div>
                <div className="py-2 space-y-1">
                  <Link to="/reports" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                    <FiFlag className="w-4 h-4" /> Жалобы
                  </Link>
                  <Link to="/admin/system-reports" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                    <AlertTriangle className="w-4 h-4" /> Системные репорты
                  </Link>
                  {currentUser.roles?.admin && (
                    <Link to="/admin/users" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                      <FiUser className="w-4 h-4" /> Пользователи
                    </Link>
                  )}
                  {currentUser.roles?.admin && (
                    <Link to="/analytics" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                      <FiBarChart2 className="w-4 h-4" /> Аналитика
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Меню Пользователя */}
          <div className="relative group">
            <Link to="/profile" className="flex items-center gap-3 cursor-pointer p-2 rounded-full hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:scale-105">
              <img
                src={formatAvatarUrl(currentUser)}
                alt={currentUser.username}
                className="w-9 h-9 rounded-full object-cover border-2 border-gray-200 group-hover:border-indigo-400 transition-all duration-300 hover:shadow-lg"
              />
              <div className="hidden lg:block">
                <Username user={currentUser} />
              </div>
            </Link>
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right scale-95 group-hover:scale-100 p-3 z-50 border border-gray-100">
              <div className="px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg mb-2">
                <Username user={currentUser} />
              </div>
              <div className="py-2 space-y-1">
                <Link to="/profile" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                  <FiUser className="w-4 h-4" /> Профиль
                </Link>
                <Link to="/chats" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                  <FiMessageSquare className="w-4 h-4" /> Чаты
                </Link>
                <Link to="/my-requests" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                  <FiGrid className="w-4 h-4" /> Мои заявки
                </Link>
                {requestId && (
                  <Link to={`/request/${requestId}`} className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600 rounded-xl transition-all duration-300 hover:scale-105">
                    <FiInfo className="w-4 h-4" /> Детали этой заявки
                  </Link>
                )}
              </div>
              <div className="pt-2 border-t border-gray-100 mt-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-all duration-300 hover:scale-105"
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
      <div className="hidden md:flex items-center space-x-3">
        <Link to="/login" className="btn btn-secondary-outline hover:scale-105 transition-all duration-300">
          Войти
        </Link>
        <Link to="/register" className="btn btn-primary hover:scale-105 transition-all duration-300 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700">
          Регистрация
        </Link>
      </div>
    );
  };

  return (
    <>
      <header className={`sticky top-0 w-full z-30 transition-all duration-500 ${isScrolled ? 'bg-white/95 shadow-2xl backdrop-blur-md border-b border-gray-100' : 'bg-white'}`}>
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
                className="md:hidden text-gray-600 hover:text-indigo-600 p-2 rounded-lg hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 hover:scale-110"
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
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl p-6 flex flex-col rounded-l-3xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center pb-6 border-b border-gray-200">
                <span className="text-lg font-bold">
                  Меню
                </span>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-all duration-300 hover:scale-110"
                >
                  <FiX size={24} />
                </button>
              </div>

              <nav className="flex-grow mt-8 flex flex-col space-y-3 overflow-y-auto">
                <Link to="/requests" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${isActive('/requests')} ${location.pathname === '/requests' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                  <FiGrid className="w-6 h-6" /> Заявки
                </Link>
                <Link to="/about" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${isActive('/about')} ${location.pathname === '/about' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                  <FiHelpCircle className="w-6 h-6" /> О нас
                </Link>

                {currentUser && (
                  <>
                    <div className="pt-6 mt-6 border-t border-gray-200" />
                    <span className="px-4 pb-2 block text-sm font-semibold text-gray-500 uppercase tracking-wider">
                      Личный кабинет
                    </span>

                    <Link to="/profile" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/profile' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                      <FiUser className="w-6 h-6" /> Профиль
                    </Link>
                    <Link to="/notifications" className={`flex items-center justify-between px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/notifications' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                      <div className="flex items-center gap-4">
                        <FiBell className="w-6 h-6" />
                        <span>Уведомления</span>
                      </div>
                      {currentUser && currentUser.unreadCount > 0 && (
                        <span className="flex items-center justify-center min-w-[28px] h-7 px-2 rounded-full bg-gradient-to-r from-red-500 to-pink-500 text-xs font-medium text-white shadow-lg">
                          {currentUser.unreadCount > 99 ? '99+' : currentUser.unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link to="/chats" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/chats' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                      <FiMessageSquare className="w-6 h-6" /> Чаты
                    </Link>
                    <Link to="/my-requests" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/my-requests' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                      <FiGrid className="w-6 h-6" /> Мои заявки
                    </Link>
                    {requestId && (
                      <Link to={`/request/${requestId}`} className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === `/request/${requestId}` ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                        <FiInfo className="w-6 h-6" /> Детали заявки
                      </Link>
                    )}

                    {(currentUser.roles?.admin || currentUser.roles?.moderator) && (
                      <>
                        <div className="pt-6 mt-6 border-t border-gray-200" />
                        <span className="px-4 pb-2 block text-sm font-semibold text-gray-500 uppercase tracking-wider">
                          Панель управления
                        </span>
                        <Link to="/reports" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/reports' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                          <FiFlag className="w-6 h-6" /> Жалобы
                        </Link>
                        <Link to="/admin/system-reports" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/admin/system-reports' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                          <AlertTriangle className="w-6 h-6" /> Системные репорты
                        </Link>
                        {currentUser.roles.admin && (
                          <Link to="/admin/users" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/admin/users' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                            <FiUser className="w-6 h-6" /> Пользователи
                          </Link>
                        )}
                        {currentUser.roles.admin && (
                          <Link to="/analytics" className={`flex items-center gap-4 px-4 py-4 rounded-xl text-lg transition-all duration-300 hover:scale-105 ${location.pathname === '/analytics' ? 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600' : 'hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 hover:text-indigo-600'}`}>
                            <FiBarChart2 className="w-6 h-6" /> Аналитика
                          </Link>
                        )}
                      </>
                    )}
                  </>
                )}
              </nav>

              <div className="mt-auto pt-6 border-t border-gray-200">
                {currentUser ? (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 px-4 py-4 text-lg text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all duration-300 hover:scale-105"
                  >
                    <FiLogOut className="w-6 h-6" /> Выйти
                  </button>
                ) : (
                  <div className="flex flex-col space-y-3">
                    <Link to="/login" className="btn btn-secondary-outline w-full py-4 text-lg hover:scale-105 transition-all duration-300">
                      Войти
                    </Link>
                    <Link to="/register" className="btn btn-primary w-full py-4 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:scale-105 transition-all duration-300">
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