"use client"
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  const closeMenu = () => {
    setIsMenuOpen(false);
  };
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);
  
  useEffect(() => {
    closeMenu();
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
    return location.pathname === path ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600';
  };
  
  return (
    <header className={`fixed w-full z-30 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-white/80 backdrop-blur-sm py-4'}`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Логотип */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xl">БК</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Бірге Көмек</span>
          </Link>
          
          {/* Навигация для десктопа */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className={`text-sm font-medium transition-colors duration-300 ${isActive('/')}`}>
              Главная
            </Link>
            <Link to="/requests" className={`text-sm font-medium transition-colors duration-300 ${isActive('/requests')}`}>
              Запросы
            </Link>
            <Link to="/about" className={`text-sm font-medium transition-colors duration-300 ${isActive('/about')}`}>
              О нас
            </Link>
            
            {currentUser ? (
              <div className="relative group">
                <button className="flex items-center space-x-1 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300">
                  <span>{currentUser.username || 'Профиль'}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform origin-top-right">
                  <div className="py-1">
                    <Link to="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
                      Мой профиль
                    </Link>
                    <Link to="/requests" className="block px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600">
                      Мои запросы
                    </Link>
                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
                    >
                      Выйти
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-300">
                  Войти
                </Link>
                <Link to="/register" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md transition-all duration-300 transform hover:translate-y-[-2px]">
                  Регистрация
                </Link>
              </div>
            )}
          </nav>
          
          {/* Кнопка мобильного меню */}
          <button 
            className="md:hidden text-gray-500 hover:text-gray-700 focus:outline-none"
            onClick={toggleMenu}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
        
        {/* Мобильное меню */}
        <div className={`md:hidden transition-all duration-300 ease-in-out overflow-hidden ${isMenuOpen ? 'max-h-96 opacity-100 mt-4' : 'max-h-0 opacity-0'}`}>
          <div className="flex flex-col space-y-4 pt-2 pb-4">
            <Link to="/" className={`text-sm font-medium transition-colors duration-300 ${isActive('/')}`}>
              Главная
            </Link>
            <Link to="/requests" className={`text-sm font-medium transition-colors duration-300 ${isActive('/requests')}`}>
              Запросы
            </Link>
            <Link to="/about" className={`text-sm font-medium transition-colors duration-300 ${isActive('/about')}`}>
              О нас
            </Link>
            
            <div className="border-t border-gray-200 my-2"></div>
            
            {currentUser ? (
              <>
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <span className="text-indigo-600 font-bold">
                      {currentUser.username ? currentUser.username.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{currentUser.username || 'Пользователь'}</span>
                </div>
                <Link to="/profile" className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300">
                  Мой профиль
                </Link>
                <Link to="/requests" className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors duration-300">
                  Мои запросы
                </Link>
                <button 
                  onClick={handleLogout}
                  className="text-left text-sm font-medium text-red-600 hover:text-red-700 transition-colors duration-300"
                >
                  Выйти
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-3">
                <Link to="/login" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors duration-300">
                  Войти
                </Link>
                <Link to="/register" className="text-sm font-medium text-center text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md transition-all duration-300">
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header; 