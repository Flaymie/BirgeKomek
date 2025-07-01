import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TelegramAuthModal from '../modals/TelegramAuthModal';
import { FaTelegramPlane } from 'react-icons/fa';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, error: authError } = useAuth();
  
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  
  // Если пользователь уже авторизован, перенаправляем на страницу запросов
  useEffect(() => {
    if (currentUser) {
      navigate('/requests');
    }
  }, [currentUser, navigate]);
  
  // Получаем сообщение из state при переходе на страницу
  useEffect(() => {
    if (location.state?.message) {
      setAuthMessage(location.state.message);
      // Очищаем state, чтобы при обновлении страницы сообщение исчезло
      window.history.replaceState({}, document.title);
    }
    
    // Проверяем сообщение из sessionStorage (от перехватчика API)
    const sessionMessage = sessionStorage.getItem('auth_message');
    if (sessionMessage) {
      setAuthMessage(sessionMessage);
      sessionStorage.removeItem('auth_message');
    }
  }, [location]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  const validate = () => {
    const newErrors = {};
    
    if (!formData.emailOrUsername.trim()) {
      newErrors.emailOrUsername = 'Введите email или имя пользователя';
    }
    
    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setAuthMessage('');
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    // Удаляем try-catch, так как AuthContext больше не бросает исключения
    const result = await login({
      emailOrUsername: formData.emailOrUsername,
      password: formData.password
    });
    
    if (result.success) {
      navigate('/requests');
    } else {
      setGeneralError(result.error || 'Произошла неизвестная ошибка');
    }
    
    setIsLoading(false);
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft">
        <div className="text-center">
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 animate-slideDown">
            Вход в аккаунт
          </h2>
          <p className="mt-3 text-center text-sm text-gray-600 animate-slideUp">
            Нет аккаунта?{' '}
            <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-300 hover:underline">
              Зарегистрируйтесь
            </Link>
          </p>
        </div>
        
        {/* Сообщение о необходимости авторизации */}
        {authMessage && (
          <div className="rounded-md bg-blue-50 p-4 animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-800">{authMessage}</p>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {generalError && (
            <div className="rounded-md bg-red-50 p-4 animate-fadeIn">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">{generalError}</h3>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-6">
            <div>
              <label htmlFor="emailOrUsername" className="block text-sm font-medium text-gray-700 mb-1">Имя пользователя</label>
              <input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                autoComplete="username"
                required
                value={formData.emailOrUsername}
                onChange={handleChange}
                className={`form-input ${errors.emailOrUsername ? 'form-input-error' : ''}`}
                placeholder="Например, my_nickname"
              />
              {errors.emailOrUsername && (
                <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.emailOrUsername}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                placeholder="Пароль"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.password}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="rememberMe"
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-all duration-200"
              />
              <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                Запомнить меня
              </label>
            </div>
            
            <div className="text-sm">
              <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline transition-all duration-300">
                Забыли пароль?
              </Link>
            </div>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 transform hover:translate-y-[-2px] hover:shadow-lg"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Вход...
                </>
              ) : 'Войти'}
            </button>
          </div>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-sm text-gray-500">или</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <div>
            <button
              type="button"
              onClick={() => setIsTelegramModalOpen(true)}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <FaTelegramPlane className="mr-2" />
              Войти через Telegram
            </button>
          </div>

        </form>
      </div>
      <TelegramAuthModal 
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        authAction="login"
      />
    </div>
  );
};

export default LoginPage;