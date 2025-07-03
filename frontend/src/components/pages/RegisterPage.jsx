import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AvatarUpload from '../layout/AvatarUpload';
import { authService } from '../../services/api';
import zxcvbn from 'zxcvbn';
import PasswordStrengthMeter from '../shared/PasswordStrengthMeter';
import TelegramAuthModal from '../modals/TelegramAuthModal';
import { FaTelegramPlane } from 'react-icons/fa';
import { BiLoader } from 'react-icons/bi';
import { 
  HiOutlineUser, 
  HiOutlineLockClosed, 
  HiOutlineEye, 
  HiOutlineEyeOff,
  HiOutlineExclamationCircle,
  HiOutlineUserGroup,
  HiOutlineAcademicCap,
  HiOutlineCheck,
  HiOutlineX,
  HiOutlineRefresh,
  HiOutlineBookOpen,
  HiOutlineUserCircle,
  HiOutlineSupport
} from 'react-icons/hi';

// ПРАВИЛЬНЫЙ СПИСОК ПРЕДМЕТОВ
const subjectOptions = [
  { value: 'Математика', label: 'Математика', icon: '➗' },
  { value: 'Физика', label: 'Физика', icon: '⚛️' },
  { value: 'Химия', label: 'Химия', icon: '🧪' },
  { value: 'Биология', label: 'Биология', icon: '🧬' },
  { value: 'История', label: 'История', icon: '📜' },
  { value: 'География', label: 'География', icon: '🌍' },
  { value: 'Литература', label: 'Литература', icon: '📚' },
  { value: 'Русский язык', label: 'Русский язык', icon: '🇷🇺' },
  { value: 'Казахский язык', label: 'Казахский язык', icon: '🇰🇿' },
  { value: 'Английский язык', label: 'Английский язык', icon: '🇬🇧' },
  { value: 'Информатика', label: 'Информатика', icon: '💻' },
  { value: 'Другое', label: 'Другое', icon: '🔍' },
];

// Хук для "дебаунса" - чтобы не слать запрос на каждую букву
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);
    return debouncedValue;
};

const RegisterPage = () => {
  const { currentUser, register } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Если пользователь уже авторизован, не пускаем его на эту страницу
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    password2: '',
    role: 'student', // по умолчанию ученик
    grade: '',
    avatar: '', // добавляем поле для аватарки
  });
  const [subjects, setSubjects] = useState([]); // отдельное состояние для предметов
  const [passwordScore, setPasswordScore] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  
  // Состояния для асинхронной валидации
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle, loading, available, unavailable, error
  const [usernameError, setUsernameError] = useState('');
  const [errors, setErrors] = useState({});

  const debouncedUsername = useDebounce(formData.username, 500);

  const { username, password, password2, role, grade } = formData;
  
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ 
      ...formData, 
      [name]: type === 'checkbox' ? checked : value 
    });
    
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = {...prev};
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Обработчик изменения аватара
  const handleAvatarChange = (avatarUrl) => {
    setFormData({ ...formData, avatar: avatarUrl });
  };

  const handleSubjectChange = (e) => {
    const { name, checked } = e.target;
    if (checked) {
      setSubjects([...subjects, name]);
    } else {
      setSubjects(subjects.filter(subj => subj !== name));
    }
  };

  // Обработчик для выбора предмета через карточку
  const handleSubjectCardClick = (subject) => {
    if (subjects.includes(subject)) {
      setSubjects(subjects.filter(subj => subj !== subject));
    } else {
      setSubjects([...subjects, subject]);
    }
  };

  // Обработчик для выбора роли через карточку
  const handleRoleCardClick = (selectedRole) => {
    setFormData({
      ...formData,
      role: selectedRole
    });
  };

  // Валидация username
  useEffect(() => {
    // Сначала валидация на фронте по символам
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (debouncedUsername && !usernameRegex.test(debouncedUsername)) {
        setUsernameStatus('unavailable');
        setUsernameError('Имя может содержать только латиницу, цифры, _ и -');
        return;
    }

    if (debouncedUsername.length < 3) {
        setUsernameStatus('idle');
        setUsernameError(''); // Сбрасываем ошибку, если имя стало коротким
        return;
    }

    const checkUsername = async () => {
        setUsernameStatus('loading');
        try {
            const res = await authService.checkUsername(debouncedUsername);
            if (res.data.available) {
                setUsernameStatus('available');
                setUsernameError('');
            } else {
                setUsernameStatus('unavailable');
                setUsernameError('Это имя пользователя уже занято');
            }
        } catch (error) {
            setUsernameStatus('error');
            setUsernameError('Ошибка проверки имени');
        }
    };
    checkUsername();
  }, [debouncedUsername]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));

    if (name === 'password') {
      setPasswordScore(zxcvbn(value).score);
    }
    if (name === 'username') {
      setUsernameStatus('idle');
      setUsernameError('');
    }
    
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
    
    if (!username.trim()) {
      newErrors.username = 'Введите никнейм';
    }
    
    if (!password) {
      newErrors.password = 'Введите пароль';
    }
    
    if (password !== password2) {
      newErrors.password2 = 'Пароли не совпадают';
    }
    
    if (role === 'student' && !grade) {
      newErrors.grade = 'Укажите ваш класс';
    }
    
    if (role === 'helper' && subjects.length === 0) {
      newErrors.subjects = 'Выберите хотя бы один предмет';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    try {
      setLoading(true);
      setError('');
      
      const registrationData = { ...formData };
      if (role === 'helper') {
        registrationData.subjects = subjects;
      }
      
      await register(registrationData);
      
      toast.success('Регистрация прошла успешно! Теперь вы можете войти.');
      navigate('/login');
      
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Ошибка регистрации. Попробуйте еще раз.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const ValidationIcon = ({ status }) => {
    switch (status) {
        case 'loading':
            return <HiOutlineRefresh className="h-5 w-5 text-gray-400 animate-spin" />;
        case 'available':
            return <HiOutlineCheck className="h-5 w-5 text-green-500" />;
        case 'unavailable':
        case 'error':
            return <HiOutlineX className="h-5 w-5 text-red-500" />;
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12 px-4 animate-gradient-x">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-3xl mb-6 shadow-md">
            <HiOutlineUserGroup className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Создание аккаунта
          </h1>
          <p className="text-gray-500">
            Заполните форму, чтобы начать пользоваться сервисом
          </p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
          <form className="space-y-8" onSubmit={onSubmit}>
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-fade-in">
                <div className="flex items-start">
                  <HiOutlineExclamationCircle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}
            
            {/* Аватар по центру */}
            <div className="flex justify-center">
              <AvatarUpload 
                onAvatarChange={handleAvatarChange} 
                size="lg"
                className="shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </div>

            {/* Имя пользователя */}
            <div className="space-y-2">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Имя пользователя
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineUser className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="username"
                  id="username"
                  className={`block w-full pl-10 pr-10 py-3 border ${
                    usernameStatus === 'available' ? 'border-green-500' : 
                    (usernameStatus === 'unavailable' || usernameStatus === 'error' || errors.username) ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300`}
                  value={username}
                  onChange={handleChange}
                  required
                  minLength="3"
                  placeholder="Введите никнейм"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                   <ValidationIcon status={usernameStatus} />
                </div>
              </div>
              {(usernameError || errors.username) && (
                <p className="text-sm text-red-600 flex items-center animate-fade-in">
                  <HiOutlineExclamationCircle className="w-4 h-4 mr-1" />
                  {usernameError || errors.username}
                </p>
              )}
            </div>

            {/* Пароль */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
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
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-10 py-3 border ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300`}
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
                <p className="text-sm text-red-600 flex items-center animate-fade-in">
                  <HiOutlineExclamationCircle className="w-4 h-4 mr-1" />
                  {errors.password}
                </p>
              )}
              <PasswordStrengthMeter score={passwordScore} />
            </div>

            {/* Подтверждение пароля */}
            <div className="space-y-2">
              <label
                htmlFor="password2"
                className="block text-sm font-medium text-gray-700"
              >
                Подтвердите пароль
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <HiOutlineLockClosed className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password2"
                  name="password2"
                  type={showPassword2 ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password2}
                  onChange={onChange}
                  className={`block w-full pl-10 pr-10 py-3 border ${
                    errors.password2 ? 'border-red-300' : 'border-gray-300'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300`}
                  placeholder="Повторите пароль"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword2(!showPassword2)} 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword2 ? (
                    <HiOutlineEyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <HiOutlineEye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password2 && (
                <p className="text-sm text-red-600 flex items-center animate-fade-in">
                  <HiOutlineExclamationCircle className="w-4 h-4 mr-1" />
                  {errors.password2}
                </p>
              )}
            </div>

            {/* Выбор роли через карточки */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">Кто вы?</label>
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => handleRoleCardClick('student')}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center transition-all duration-300 ${
                    role === 'student' 
                      ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="rounded-full bg-indigo-100 p-3 mb-2">
                    <HiOutlineUserCircle className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="font-medium">Ученик</h3>
                  <p className="text-xs text-gray-500 text-center mt-1">Получайте помощь с учебой</p>
                  {role === 'student' && (
                    <div className="absolute top-2 right-2">
                      <HiOutlineCheck className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}
                </div>
                
                <div 
                  onClick={() => handleRoleCardClick('helper')}
                  className={`relative cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center transition-all duration-300 ${
                    role === 'helper' 
                      ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="rounded-full bg-indigo-100 p-3 mb-2">
                    <HiOutlineSupport className="h-6 w-6 text-indigo-600" />
                  </div>
                  <h3 className="font-medium">Хелпер</h3>
                  <p className="text-xs text-gray-500 text-center mt-1">Помогайте другим с учебой</p>
                  {role === 'helper' && (
                    <div className="absolute top-2 right-2">
                      <HiOutlineCheck className="h-5 w-5 text-indigo-600" />
                    </div>
                  )}
                </div>
              </div>

              {/* Выбор класса */}
              {(role === 'student' || role === 'helper') && (
                <div className="space-y-2 mt-4">
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Класс</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <HiOutlineAcademicCap className="h-5 w-5 text-gray-400" />
                    </div>
                    <select 
                      id="grade" 
                      name="grade" 
                      value={grade} 
                      onChange={handleChange} 
                      className={`block w-full pl-10 pr-3 py-3 border ${
                        errors.grade ? 'border-red-300' : 'border-gray-300'
                      } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 appearance-none`}
                    >
                      <option value="">Выберите ваш класс</option>
                      {[...Array(5)].map((_, i) => (
                        <option key={i + 7} value={i + 7}>{i + 7} класс</option>
                      ))}
                    </select>
                  </div>
                  {errors.grade && (
                    <p className="text-sm text-red-600 flex items-center animate-fade-in">
                      <HiOutlineExclamationCircle className="w-4 h-4 mr-1" />
                      {errors.grade}
                    </p>
                  )}
                </div>
              )}

              {/* Выбор предметов через карточки */}
              {role === 'helper' && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Предметы, в которых вы можете помочь
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {subjectOptions.map((option) => (
                      <div 
                        key={option.value} 
                        onClick={() => handleSubjectCardClick(option.value)}
                        className={`cursor-pointer rounded-xl p-3 flex items-center transition-all duration-300 ${
                          subjects.includes(option.value) 
                            ? 'bg-indigo-100 border border-indigo-300' 
                            : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <div className="mr-2 text-xl">{option.icon}</div>
                        <span className="text-sm">{option.label}</span>
                        {subjects.includes(option.value) && (
                          <HiOutlineCheck className="ml-auto h-4 w-4 text-indigo-600" />
                        )}
                      </div>
                    ))}
                  </div>
                  {errors.subjects && (
                    <p className="text-sm text-red-600 flex items-center animate-fade-in">
                      <HiOutlineExclamationCircle className="w-4 h-4 mr-1" />
                      {errors.subjects}
                    </p>
                  )}
                </div>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 hover:shadow-lg"
            >
              {loading ? (
                <>
                  <BiLoader className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Регистрация...
                </>
              ) : (
                'Зарегистрироваться'
              )}
            </button>

            {/* Divider */}
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
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300"
            >
              <FaTelegramPlane className="w-5 h-5 mr-2 text-blue-500" />
              Регистрация через Telegram
            </button>
          </form>
        </div>
        
        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link 
              to="/login" 
              className="font-medium text-indigo-600 hover:text-indigo-500 transition-colors duration-300"
            >
              Войти
            </Link>
          </p>
        </div>
      </div>
      
      <TelegramAuthModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        authAction="register"
      />
    </div>
  );
};

export default RegisterPage;