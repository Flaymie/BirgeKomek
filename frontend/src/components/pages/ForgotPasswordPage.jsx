import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';
import { toast } from 'react-toastify';
import { FaUser, FaKey, FaLock } from 'react-icons/fa';

const ForgotPasswordPage = () => {
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const [isBlocked, setIsBlocked] = useState(false);
  
  const navigate = useNavigate();

  // Обработчик ввода кода - только цифры, максимум 6
  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Удаляем все, кроме цифр
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await authService.forgotPassword(username);
      setMessage(res.data.msg);
      toast.success(res.data.msg);
      setRemainingAttempts(3); // Сбрасываем счетчик при новом коде
      setIsBlocked(false); // Снимаем блокировку (если была)
      setStep(2);
    } catch (err) {
      const errMsg = err.response?.data?.msg || 'Произошла ошибка';
      const errorData = err.response?.data;
      
      // Если IP заблокирован - редирект на главную
      if (err.response?.status === 403 && errorData?.blocked) {
        toast.error('Ваш IP заблокирован на 24 часа из-за превышения количества попыток');
        setTimeout(() => navigate('/'), 2000);
        return;
      }
      
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      toast.error('Пароли не совпадают');
      return;
    }
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await authService.resetPassword({ username, code, password });
      toast.success(res.data.msg);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      const errMsg = err.response?.data?.msg || 'Произошла ошибка';
      const errorData = err.response?.data;
      
      // Обрабатываем блокировку IP
      if (err.response?.status === 403 && errorData?.blocked) {
        setIsBlocked(true);
        setRemainingAttempts(0);
        setError(errMsg);
        toast.error(errMsg);
      } 
      // Обрабатываем неверный код с оставшимися попытками
      else if (errorData?.remainingAttempts !== undefined) {
        setRemainingAttempts(errorData.remainingAttempts);
        setError(errMsg);
        toast.error(errMsg);
      } 
      // Обычная ошибка
      else {
        setError(errMsg);
        toast.error(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {step === 1 ? 'Забыли пароль?' : 'Сброс пароля'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {step === 1 
            ? 'Введите ваше имя пользователя, и мы отправим код в Telegram.'
            : 'Введите код из Telegram и новый пароль.'
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}
          {message && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-green-800">{message}</p>
              </div>
            </div>
          )}

          {step === 1 ? (
            <form className="space-y-6" onSubmit={handleRequestCode}>
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Имя пользователя
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaUser className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="ваш_никнейм"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {loading ? 'Отправка...' : 'Отправить код'}
                </button>
              </div>
            </form>
          ) : (
            <form className="space-y-6" onSubmit={handleResetPassword}>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Код из Telegram
                </label>
                 <div className="mt-1 relative rounded-md shadow-sm">
                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaKey className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="code"
                    name="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength="6"
                    required
                    value={code}
                    onChange={handleCodeChange}
                    disabled={isBlocked}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="123456"
                  />
                </div>
                {remainingAttempts < 3 && remainingAttempts > 0 && (
                  <p className="mt-1 text-sm text-orange-600">
                    Осталось попыток: {remainingAttempts}
                  </p>
                )}
                {isBlocked && (
                  <p className="mt-1 text-sm text-red-600 font-semibold">
                    Ваш IP заблокирован на 24 часа
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Новый пароль
                </label>
                 <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaLock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              </div>
              
               <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Подтвердите пароль
                </label>
                 <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FaLock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                 </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading || isBlocked}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Сброс...' : isBlocked ? 'IP заблокирован' : 'Сбросить пароль'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
                    Вернуться ко входу
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 