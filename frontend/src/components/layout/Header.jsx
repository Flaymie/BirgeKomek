import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Header = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggedIn] = useState(false); // пока без настоящей авторизации

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container-custom py-4">
        <div className="flex justify-between items-center">
          {/* Лого и название */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl font-bold text-primary-600">Бірге Көмек</span>
          </Link>

          {/* Десктопное меню */}
          <nav className="hidden md:flex items-center space-x-6">
            <div className="flex items-center space-x-6">
              <Link to="/" className="text-gray-700 hover:text-primary-600">Главная</Link>
              <Link to="/requests" className="text-gray-700 hover:text-primary-600">Запросы</Link>
              <Link to="/about" className="text-gray-700 hover:text-primary-600">О нас</Link>
            </div>
            {isLoggedIn ? (
              <div className="flex items-center space-x-4 ml-4">
                <Link to="/profile" className="text-gray-700 hover:text-primary-600">Профиль</Link>
                <button className="text-gray-700 hover:text-primary-600">Выйти</button>
              </div>
            ) : (
              <div className="flex items-center space-x-4 ml-4">
                <Link to="/login" className="btn btn-primary">Войти</Link>
                <Link to="/register" className="btn btn-secondary">Регистрация</Link>
              </div>
            )}
          </nav>

          {/* Мобильная кнопка меню */}
          <button 
            className="md:hidden p-2" 
            onClick={toggleMenu}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>

        {/* Мобильное меню */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-4 flex flex-col">
            <Link to="/" className="text-gray-700 hover:text-primary-600 py-2">Главная</Link>
            <Link to="/requests" className="text-gray-700 hover:text-primary-600 py-2">Запросы</Link>
            <Link to="/about" className="text-gray-700 hover:text-primary-600 py-2">О нас</Link>
            {isLoggedIn ? (
              <>
                <Link to="/profile" className="text-gray-700 hover:text-primary-600 py-2">Профиль</Link>
                <button className="text-gray-700 hover:text-primary-600 py-2 text-left">Выйти</button>
              </>
            ) : (
              <div className="flex flex-col space-y-2 mt-2">
                <Link to="/login" className="btn btn-primary w-full text-center">Войти</Link>
                <Link to="/register" className="btn btn-secondary w-full text-center">Регистрация</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header; 