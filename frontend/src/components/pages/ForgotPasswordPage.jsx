import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Пожалуйста, введите корректный email');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Тут будет API запрос на восстановление пароля
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Имитация успешной отправки письма
      console.log('Восстановление пароля для:', email);
      setIsSubmitted(true);
    } catch (err) {
      setError('Ошибка при отправке запроса. Попробуйте позже.');
      console.error('Ошибка восстановления пароля:', err);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8 animate-fadeIn">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-soft">
        <div className="text-center">
          <h2 className="mt-2 text-center text-3xl font-extrabold text-gray-900 animate-slideDown">
            Восстановление пароля
          </h2>
          <p className="mt-3 text-center text-sm text-gray-600 animate-slideUp">
            Введите ваш email, и мы отправим инструкции по восстановлению пароля
          </p>
        </div>
        
        {isSubmitted ? (
          <div className="rounded-md bg-green-50 p-6 mt-8 animate-fadeIn">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-7 w-7 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Инструкции по восстановлению пароля отправлены на ваш email
                </p>
                <p className="mt-2 text-sm text-green-700">
                  Проверьте свой почтовый ящик и следуйте инструкциям из письма. 
                  Если письмо не пришло в течение нескольких минут, проверьте папку "Спам".
                </p>
              </div>
            </div>
            <div className="mt-6 text-center">
              <Link to="/login" className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300">
                <svg className="mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Вернуться на страницу входа
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4 animate-fadeIn">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">{error}</h3>
                  </div>
                </div>
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="Введите ваш email"
              />
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
                    Отправка...
                  </>
                ) : 'Отправить инструкции'}
              </button>
            </div>
            
            <div className="pt-2 text-center">
              <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 hover:underline transition-all duration-300 inline-flex items-center">
                <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Вернуться на страницу входа
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage; 