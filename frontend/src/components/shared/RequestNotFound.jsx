import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SafeMotionDiv } from './SafeMotion';

const RequestNotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-3xl mx-auto">
        <SafeMotionDiv
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <svg className="mx-auto h-24 w-24 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </SafeMotionDiv>

        <SafeMotionDiv
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Запрос не найден
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Запрос, который вы ищете, не существует, был удален или перемещен.
          </p>
        </SafeMotionDiv>

        <SafeMotionDiv
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-center gap-4"
        >
          <button
            onClick={() => navigate('/requests')}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-300"
          >
            К списку запросов
          </button>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors duration-300"
          >
            Вернуться назад
          </button>
        </SafeMotionDiv>
      </div>
    </div>
  );
};

export default RequestNotFound; 