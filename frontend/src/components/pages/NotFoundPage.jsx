import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFoundPage = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-12">
      <div className="text-center max-w-3xl mx-auto">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h1 className="text-9xl font-bold text-blue-600 mb-2">404</h1>
        </motion.div>
        
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Страница не найдена
          </h2>
          <p className="text-lg text-gray-600 mb-6">
            Страница, которую вы ищете, не существует или была перемещена.
          </p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex flex-col sm:flex-row justify-center gap-4"
        >
          <Link 
            to="/"
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-300"
          >
            На главную
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default NotFoundPage; 