import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TelegramAuthModal from '../modals/TelegramAuthModal';
import IPVerificationModal from '../modals/IPVerificationModal';
import { 
  FaTelegramPlane 
} from 'react-icons/fa';
import { 
  HiOutlineUser, 
  HiOutlineLockClosed, 
  HiOutlineEye, 
  HiOutlineEyeOff,
  HiOutlineInformationCircle,
  HiOutlineExclamationCircle
} from 'react-icons/hi';
import { 
  BiLoader 
} from 'react-icons/bi';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, error: authError } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    rememberMe: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isIPVerificationOpen, setIsIPVerificationOpen] = useState(false);
  const [currentIP, setCurrentIP] = useState('');
  
  useEffect(() => {
    if (location.state?.message) {
      setAuthMessage(location.state.message);
      window.history.replaceState({}, document.title);
    }
    
    const sessionMessage = sessionStorage.getItem('auth_message');
    if (sessionMessage) {
      setAuthMessage(sessionMessage);
      sessionStorage.removeItem('auth_message');
    }
    if (currentUser) {
      navigate('/');
    }
  }, [location, currentUser, navigate]);
  
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
    
    if (!formData.username.trim()) {
      newErrors.username = 'Введите никнейм';
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
    
    const newErrors = {};
    if (!formData.username) newErrors.username = 'Имя пользователя обязательно';
    if (!formData.password) newErrors.password = 'Пароль обязателен';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    const result = await login(formData);
    setIsLoading(false);
    
    if (result.success) {
      // Проверяем, требуется ли подтверждение IP
      if (result.requireIPVerification) {
        const ip = result.currentIP || 'Unknown';
        setCurrentIP(ip);
        setIsIPVerificationOpen(true);
      } else {
        const from = location.state?.from || '/';
        navigate(from, { replace: true });
      }
    } else {
      // Проверяем, заблокирован ли IP
      if (result.code === 'IP_BLOCKED') {
        setGeneralError('Ваш IP адрес заблокирован на 24 часа из-за подозрительной активности. Если это ошибка, свяжитесь с поддержкой.');
      } else {
        setGeneralError(result.error || 'Произошла ошибка входа');
      }
    }
  };
  
  const handleIPVerificationSuccess = () => {
    const from = location.state?.from || '/';
    navigate(from, { replace: true });
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100 py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-6">
            <HiOutlineUser className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Добро пожаловать
          </h1>
          <p className="text-gray-500">
            Войдите в свой аккаунт, чтобы продолжить
          </p>
        </div>

        {authMessage && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-start">
              <HiOutlineInformationCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-blue-800">{authMessage}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {generalError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-start">
                  <HiOutlineExclamationCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-800">{generalError}</p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Никнейм
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-3 py-3 border ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
                  placeholder="Введите никнейм"
                />
              </div>
              {errors.username && (
                <p className="text-sm text-red-600 flex items-center">
                  <HiOutlineExclamationCircle className="w-4 h-4 mr-1" />
                  {errors.username}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineLockClosed className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-3 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors`}
                  placeholder="Введите пароль"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <HiOutlineEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <HiOutlineEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-red-600 flex items-center">
                  <HiOutlineExclamationCircle className="w-4 h-4 mr-1" />
                  {errors.password}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Запомнить меня</span>
              </label>
              <Link 
                to="/forgot-password" 
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Забыли пароль?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <BiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Вход...
                </>
              ) : (
                'Войти'
              )}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">или</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTelegramModalOpen(true)}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <FaTelegramPlane className="w-5 h-5 mr-2 text-blue-500" />
              Войти через Telegram
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Нет аккаунта?{' '}
            <Link 
              to="/register" 
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Зарегистрируйтесь
            </Link>
          </p>
        </div>
      </div>

      <TelegramAuthModal 
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        authAction="login"
      />
      
      <IPVerificationModal
        isOpen={isIPVerificationOpen}
        onClose={() => setIsIPVerificationOpen(false)}
        onSuccess={handleIPVerificationSuccess}
        currentIP={currentIP}
      />
    </div>
  );
};

export default LoginPage;