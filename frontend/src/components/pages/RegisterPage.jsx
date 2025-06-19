import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register, currentUser, login } = useAuth();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student', // По умолчанию - студент
    grade: '', // Класс
    agreeTerms: false
  });
  
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Если пользователь уже авторизован, перенаправляем на страницу запросов
  useEffect(() => {
    if (currentUser) {
      navigate('/requests');
    }
  }, [currentUser, navigate]);
  
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
      newErrors.username = 'Введите имя пользователя';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Имя пользователя должно быть не менее 3 символов';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Введите email';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Неправильный формат email';
    }
    
    if (!formData.password) {
      newErrors.password = 'Введите пароль';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Пароль должен быть не менее 6 символов';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают';
    }
    
    if (!formData.grade) {
      newErrors.grade = 'Выберите класс';
    }
    
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'Вы должны согласиться с условиями';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError('');
    setSuccessMessage('');
    
    if (!validate()) return;
    
    setIsLoading(true);
    
    try {
      // Подготавливаем данные для отправки на сервер
      const userData = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        grade: parseInt(formData.grade),
        roles: {
          student: true, // Все пользователи по умолчанию студенты
          helper: formData.role === 'helper' // Хелпер только если выбрана роль "helper"
        }
      };
      
      console.log('Отправляемые данные:', userData);
      
      const result = await register(userData);
      
      if (result.success) {
        // Сразу пытаемся войти
        const loginResult = await login({
          email: formData.email,
          password: formData.password
        });
        
        if (loginResult) {
          // Если вход успешен, перенаправляем на страницу запросов
          navigate('/requests');
        } else {
          // Если вход не удался, показываем сообщение
          setSuccessMessage('Регистрация успешна, но не удалось войти автоматически. Пожалуйста, войдите вручную.');
          setTimeout(() => {
            navigate('/login');
          }, 2000);
        }
      } else {
        setGeneralError(result.error || 'Произошла ошибка при регистрации');
      }
    } catch (err) {
      console.error('Ошибка регистрации:', err);
      setGeneralError(err.message || 'Произошла ошибка при регистрации');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft">
        <div className="text-center">
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 animate-slideDown">
            Регистрация
          </h2>
          <p className="mt-3 text-center text-sm text-gray-600 animate-slideUp">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-300 hover:underline">
              Войдите
            </Link>
          </p>
        </div>
        
        {successMessage && (
          <div className="rounded-md bg-green-50 p-4 animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
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
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">Имя пользователя</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={formData.username}
                onChange={handleChange}
                className={`form-input ${errors.username ? 'form-input-error' : ''}`}
                placeholder="Имя пользователя"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.username}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                className={`form-input ${errors.email ? 'form-input-error' : ''}`}
                placeholder="Email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.email}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                className={`form-input ${errors.password ? 'form-input-error' : ''}`}
                placeholder="Пароль"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.password}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Подтверждение пароля</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`form-input ${errors.confirmPassword ? 'form-input-error' : ''}`}
                placeholder="Подтвердите пароль"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.confirmPassword}</p>
              )}
            </div>
            
            <div>
              <label htmlFor="grade" className="block text-sm font-medium text-gray-700 mb-1">
                Класс
              </label>
              <select
                id="grade"
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className={`form-select ${errors.grade ? 'form-input-error' : ''}`}
              >
                <option value="">Выберите класс</option>
                {[...Array(11)].map((_, i) => (
                  <option key={i+1} value={i+1}>{i+1} класс</option>
                ))}
              </select>
              {errors.grade && (
                <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.grade}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Роль на платформе
              </label>
              <div className="space-y-3">
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="student"
                      name="role"
                      type="radio"
                      value="student"
                      checked={formData.role === 'student'}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="student" className="font-medium text-gray-700 group relative cursor-pointer">
                      Ученик
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute z-10 bg-gray-800 text-white text-xs rounded py-1 px-2 left-0 -bottom-8 w-52">
                        Можно создавать запросы о помощи
                      </div>
                    </label>
                    <div className="text-gray-500">
                      <span>Можно создавать запросы о помощи</span>
                    </div>
                  </div>
                </div>
                
                <div className="relative flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="helper"
                      name="role"
                      type="radio"
                      value="helper"
                      checked={formData.role === 'helper'}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="helper" className="font-medium text-gray-700 group relative cursor-pointer">
                      Помощник (хелпер)
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute z-10 bg-gray-800 text-white text-xs rounded py-1 px-2 left-0 -bottom-8 w-52">
                        Можно помогать другим и создавать запросы
                      </div>
                    </label>
                    <div className="text-gray-500">
                      <span>Можно помогать другим и создавать запросы</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <input
                id="agreeTerms"
                name="agreeTerms"
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded transition-all duration-200"
              />
              <label htmlFor="agreeTerms" className="ml-2 block text-sm text-gray-900">
                Я согласен с <Link to="/terms" className="text-indigo-600 hover:text-indigo-500 hover:underline">условиями использования</Link>
              </label>
            </div>
            {errors.agreeTerms && (
              <p className="mt-1 text-sm text-red-600 animate-fadeIn">{errors.agreeTerms}</p>
            )}
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
                  Регистрация...
                </>
              ) : 'Зарегистрироваться'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage; 