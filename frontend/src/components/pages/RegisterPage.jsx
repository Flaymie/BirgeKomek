import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import AvatarUpload from '../layout/AvatarUpload';

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

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    role: 'student', // по умолчанию ученик
    grade: '',
    avatar: '', // добавляем поле для аватарки
  });
  const [subjects, setSubjects] = useState([]); // отдельное состояние для предметов

  const { username, email, password, password2, role, grade } = formData;
  
  const navigate = useNavigate();
  const { register } = useAuth();
  
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

  const onSubmit = async (e) => {
    e.preventDefault();
    
    // Валидация формы перед отправкой
    if (!username || !email || !password) {
      toast.error('Все обязательные поля должны быть заполнены');
      console.error('Пустые обязательные поля:', { username, email, password });
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
      email,
      password,
      roles: {
        student: role === 'student',
        helper: role === 'helper'
      },
      avatar: formData.avatar, // Добавляем аватар в регистрационные данные
    };
    
    if (role === 'student') {
      registrationData.grade = grade;
    }
    
    if (role === 'helper') {
      registrationData.subjects = subjects;
    }

    try {
      // Выводим данные регистрации для отладки
      console.log('Отправляемые данные регистрации:', JSON.stringify(registrationData));
      
      const result = await register(registrationData);
      console.log('Результат регистрации:', result);
      
      if (result && result.success) {
      toast.success('Регистрация прошла успешно! Теперь можете войти.');
      navigate('/login');
      } else {
        // Если регистрация не удалась, но ошибки не были выброшены
        const errorMsg = result?.error || 'Произошла ошибка при регистрации. Попробуйте еще раз.';
        toast.error(errorMsg);
        console.error('Ошибка регистрации:', errorMsg);
      }
    } catch (err) {
      console.error('Исключение при регистрации:', err);
      
      // Подробное логирование ошибки
      if (err.response) {
        console.error('Данные ответа:', err.response.data);
        console.error('Статус ответа:', err.response.status);
        console.error('Заголовки ответа:', err.response.headers);
        
        // Если сервер вернул массив ошибок, показываем их все
        if (err.response.data && err.response.data.errors && Array.isArray(err.response.data.errors)) {
          err.response.data.errors.forEach(error => {
            console.error(`Ошибка поля ${error.path}: ${error.msg}`);
            toast.error(`${error.msg}`);
          });
        } else {
      const errorMsg = err.response?.data?.msg || err.response?.data?.errors?.[0]?.msg || 'Ошибка регистрации';
      toast.error(errorMsg);
        }
      } else if (err.request) {
        console.error('Запрос был отправлен, но ответ не получен', err.request);
        toast.error('Не удалось получить ответ от сервера. Проверьте подключение к интернету.');
      } else {
        console.error('Ошибка при настройке запроса:', err.message);
        toast.error(`Ошибка: ${err.message}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Создать аккаунт
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={onSubmit}>
          {/* Выбор аватара */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 text-center mb-2">
              Ваша фотография (необязательно)
            </label>
            <AvatarUpload 
              currentAvatar={formData.avatar}
              onAvatarChange={handleAvatarChange}
              size="lg"
              isRegistration={true}
            />
          </div>
          
          <div>
            <label htmlFor="username" className="sr-only">Имя пользователя</label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={onChange}
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              placeholder="Имя пользователя"
            />
          </div>
          <div>
            <label htmlFor="email-address" className="sr-only">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={onChange}
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Email"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">Пароль</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={onChange}
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Пароль"
            />
          </div>
          <div>
            <label htmlFor="password2" className="sr-only">Повторите пароль</label>
            <input
              id="password2"
              name="password2"
              type="password"
              value={password2}
              onChange={onChange}
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Повторите пароль"
            />
          </div>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="role" className="sr-only">Роль</label>
              <select
                id="role"
                name="role"
                value={role}
                onChange={onChange}
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              >
                <option value="student">Я Ученик</option>
                <option value="helper">Я Хелпер</option>
              </select>
            </div>
          </div>

          {role === 'student' && (
            <div>
              <label htmlFor="grade" className="sr-only">Класс</label>
              <input
                id="grade"
                name="grade"
                type="number"
                value={grade}
                onChange={onChange}
                min="1"
                max="11"
                required
                className="appearance-none rounded relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Ваш класс (1-11)"
              />
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
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Зарегистрироваться
            </button>
          </div>
        </form>
        <div className="text-sm text-center">
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;