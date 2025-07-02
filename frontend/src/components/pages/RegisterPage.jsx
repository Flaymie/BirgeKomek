import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AvatarUpload from '../layout/AvatarUpload';
import { authService } from '../../services/api';
import zxcvbn from 'zxcvbn';
import PasswordStrengthMeter from '../shared/PasswordStrengthMeter';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import TelegramAuthModal from '../modals/TelegramAuthModal';
import { FaTelegramPlane } from 'react-icons/fa';

// ПРАВИЛЬНЫЙ СПИСОК ПРЕДМЕТОВ
const subjectOptions = [
  { value: 'Математика', label: 'Математика' },
  { value: 'Физика', label: 'Физика' },
  { value: 'Химия', label: 'Химия' },
  { value: 'Биология', label: 'Биология' },
  { value: 'История', label: 'История' },
  { value: 'География', label: 'География' },
  { value: 'Литература', label: 'Литература' },
  { value: 'Русский язык', label: 'Русский язык' },
  { value: 'Казахский язык', label: 'Казахский язык' },
  { value: 'Английский язык', label: 'Английский язык' },
  { value: 'Информатика', label: 'Информатика' },
  { value: 'Другое', label: 'Другое' },
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

  const debouncedUsername = useDebounce(formData.username, 500);

  const { username, password, password2, role, grade } = formData;
  
  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'password') {
      setPasswordScore(zxcvbn(value).score);
    }
    if (name === 'username') {
      setUsernameStatus('idle');
      setUsernameError('');
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация формы перед отправкой
    if (!username || !password) {
      toast.error('Все обязательные поля должны быть заполнены');
      console.error('Пустые обязательные поля:', { username, password });
      return;
    }
    
    if (password !== password2) {
      toast.error('Пароли не совпадают');
      return;
    }
    
    if (role === 'student' && !grade) {
      toast.error('Укажите ваш класс');
      return;
    }
    
    if (role === 'helper' && subjects.length === 0) {
      toast.error('Выберите хотя бы один предмет');
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const registrationData = { ...formData };
      delete registrationData.confirmPassword;
      
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
            return <ArrowPathIcon className="h-5 w-5 text-gray-400 animate-spin" />;
        case 'available':
            return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
        case 'unavailable':
        case 'error':
            return <XCircleIcon className="h-5 w-5 text-red-500" />;
        default:
            return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Создание аккаунта
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Войти
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={onSubmit}>
            
            <AvatarUpload onAvatarChange={handleAvatarChange} />

            {/* Имя пользователя */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Имя пользователя
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="username"
                  id="username"
                  className={`appearance-none block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none sm:text-sm ${
                    usernameStatus === 'available' ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : 
                    (usernameStatus === 'unavailable' || usernameStatus === 'error') ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-indigo-500 focus:border-indigo-500'
                  }`}
                  value={username}
                  onChange={handleChange}
                  required
                  minLength="3"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                   <ValidationIcon status={usernameStatus} />
                </div>
              </div>
              {usernameError && <p className="mt-2 text-sm text-red-600">{usernameError}</p>}
            </div>

            {/* Пароль */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Пароль
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                 <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                    {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                 </button>
              </div>
               <PasswordStrengthMeter score={passwordScore} />
            </div>

            {/* Подтверждение пароля */}
            <div>
              <label
                htmlFor="password2"
                className="block text-sm font-medium text-gray-700"
              >
                Подтвердите пароль
              </label>
                <div className="mt-1 relative">
                    <input
                      id="password2"
                      name="password2"
                      type={showPassword2 ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={password2}
                      onChange={onChange}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <button type="button" onClick={() => setShowPassword2(!showPassword2)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
                        {showPassword2 ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Выбор роли */}
            <div className="space-y-4">
              <span className="block text-sm font-medium text-gray-700">Кто вы?</span>
              <div className="rounded-md shadow-sm -space-y-px">
                <div>
                  <label htmlFor="role" className="sr-only">Роль</label>
                  <select
                    id="role"
                    name="role"
                    value={role}
                      onChange={handleChange}
                    className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  >
                    <option value="student">Я Ученик</option>
                    <option value="helper">Я Хелпер</option>
                  </select>
                </div>
              </div>

              {(role === 'student' || role === 'helper') && (
                <div className="mt-4">
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-700">Класс</label>
                  <select id="grade" name="grade" value={grade} onChange={handleChange} className="mt-1 form-select w-full">
                    <option value="">Выберите ваш класс</option>
                    {[...Array(5)].map((_, i) => (
                      <option key={i + 7} value={i + 7}>{i + 7} класс</option>
                    ))}
                  </select>
                </div>
              )}

              {role === 'helper' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Предметы, в которых вы можете помочь
                  </label>
                  <div className="grid grid-cols-2 gap-4 p-4 border border-gray-200 rounded-md">
                    {subjectOptions.map((option) => (
                      <div key={option.value} className="flex items-center">
                        <input
                          id={`subject-reg-${option.value}`}
                          name={option.value}
                          type="checkbox"
                          checked={subjects.includes(option.value)}
                          onChange={handleSubjectChange}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`subject-reg-${option.value}`} className="ml-3 block text-sm font-medium text-gray-700">
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-all duration-300">
              Зарегистрироваться
            </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-sm text-gray-500">или</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <button
              type="button"
              onClick={() => setIsTelegramModalOpen(true)}
              className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors mt-3"
            >
              <FaTelegramPlane className="mr-2" />
              Регистрация через Telegram
            </button>

          </form>
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