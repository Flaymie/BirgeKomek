import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { jwtDecode } from 'jwt-decode'; // Нужна библиотека для декодирования токена

const TelegramCallbackPage = () => {
  const { loginWithToken } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');

    if (token) {
      try {
        const decoded = jwtDecode(token);
        // В нашем JWT payload лежит в поле 'user'
        if (decoded.user) {
          loginWithToken(token, decoded.user);
          navigate('/requests', { replace: true });
        } else {
            // Если структура токена не та
            console.error('Invalid token structure');
            navigate('/login', { replace: true, state: { message: 'Ошибка входа: неверный формат токена.' } });
        }
      } catch (error) {
        console.error('Failed to decode token', error);
        navigate('/login', { replace: true, state: { message: 'Ошибка входа: не удалось обработать токен.' } });
      }
    } else {
      // Если токена в URL нет
      navigate('/login', { replace: true, state: { message: 'Ошибка входа: токен отсутствует.' } });
    }
  }, [location, navigate, loginWithToken]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <h2 className="text-xl font-semibold text-gray-700">Выполняется вход...</h2>
      </div>
    </div>
  );
};

export default TelegramCallbackPage; 