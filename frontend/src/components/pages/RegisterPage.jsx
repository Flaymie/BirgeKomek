import React, { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    // Если пользователь уже авторизован, не пускаем его на эту страницу
    if (currentUser) {
      navigate('/requests');
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
    
    const registrationData = {
      username,
      password,
      role: role,
      avatar: formData.avatar,
    };
    
    if (role === 'helper') {
      registrationData.subjects = subjects;
    }

    if (grade) {
      registrationData.grade = grade;
    }

    /*
      ВАЖНО: Поле "телефон" было убрано из формы. 
      Номер телефона теперь привязывается ИСКЛЮЧИТЕЛЬНО через Telegram 
      для верификации пользователя.
    */

    try {
      // Выводим данные регистрации для отладки
      console.log('Отправляемые данные регистрации:', JSON.stringify(registrationData));
      
      // ИСПОЛЬЗУЕМ ФУНКЦИЮ ИЗ КОНТЕКСТА
      const result = await register(registrationData);
      
      // Контекст сам обработает состояние, а мы делаем редирект
      if (result && result.success) {
        navigate('/requests');
      }
      
    } catch (err) {
      // Блок catch здесь остается на случай, если сама функция register выбросит исключение,
      // хотя основная логика ошибок (ответы сервера) обрабатывается внутри.
      console.error('Неожиданное исключение в компоненте RegisterPage:', err);
      toast.error('Произошла непредвиденная ошибка.');
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
        </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={onSubmit}>
            
            <div className="flex flex-col items-center">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Фотография (необязательно)
            </label>
            <AvatarUpload 
              currentAvatar={formData.avatar}
              onAvatarChange={handleAvatarChange}
              size="lg"
                  isRegistration={true}
            />
          </div>
          
          <div className="mt-8 space-y-6">
            <div className="relative">
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">Имя пользователя</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input id="username" name="username" type="text" required value={username} onChange={handleChange}
                     className={`form-input pr-10 ${usernameStatus === 'unavailable' || usernameStatus === 'error' ? 'form-input-error' : ''}`}
                     placeholder="my_nickname" />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <ValidationIcon status={usernameStatus} />
                </div>
              </div>
              {usernameStatus === 'unavailable' && <p className="mt-2 text-sm text-red-600">{usernameError}</p>}
            </div>

            <div>
              <label htmlFor="password-input" className="block text-sm font-medium text-gray-700">Пароль</label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              {formData.password && <PasswordStrengthMeter score={passwordScore} password={formData.password} />}
            </div>
            
            <div>
              <label htmlFor="password2" className="block text-sm font-medium text-gray-700">Повторите пароль</label>
              <div className="mt-1 relative">
                <input
                  id="password2"
                  name="password2"
                  type={showPassword2 ? 'text' : 'password'}
                  required
                  value={password2}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword2(!showPassword2)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword2 ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
            </div>

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

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Уже есть аккаунт?</span>
              </div>
            </div>

            <div className="mt-6">
              <Link to="/login" className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50">
                Войти
              </Link>
            </div>
          </div>
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