import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';
import { toast } from 'react-toastify';
import { Eye, CheckCircle, User, AlertTriangle, Hash, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SystemReportCard = ({ report, onResolve }) => {
  const { targetUser, details, createdAt } = report;
  
  // Используем готовое значение с бэкенда, если оно есть
  const totalPoints = targetUser?.suspicionScore ?? details.log.reduce((acc, entry) => acc + entry.points, 0);

  const getSeverityLevel = (points) => {
    if (points >= 100) return 'Критический';
    if (points >= 50) return 'Высокий';
    if (points >= 20) return 'Средний';
    return 'Низкий';
  };

  const getSeverityColor = (points) => {
    if (points >= 100) return { bg: 'bg-red-100', text: 'text-red-800' };
    if (points >= 50) return { bg: 'bg-orange-100', text: 'text-orange-800' };
    if (points >= 20) return { bg: 'bg-yellow-100', text: 'text-yellow-800' };
    return { bg: 'bg-blue-100', text: 'text-blue-800' };
  };

  const severityColor = getSeverityColor(totalPoints);

  return (
    <Link to={`/admin/system-reports/${report._id}`} className="block h-full">
      <div className="bg-white rounded-xl shadow-lg h-full flex flex-col overflow-hidden transform hover:-translate-y-1.5 transition-transform duration-300 ease-in-out group border-b-4 border-transparent hover:border-indigo-500">
        <div className="p-5 flex-grow">
          {/* Header с статусом и датой */}
          <div className="flex justify-between items-start mb-3">
            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${severityColor.bg} ${severityColor.text}`}>
              {getSeverityLevel(totalPoints)}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(createdAt).toLocaleDateString('ru-RU')}
            </span>
          </div>
          
          {/* Информация о пользователе */}
          <div className="flex items-center gap-3 mb-3">
            <img 
              src={targetUser.avatar || '/img/default-avatar.png'} 
              alt={targetUser.username} 
              className="w-12 h-12 rounded-full border-2 border-gray-200" 
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 text-gray-600 mb-1">
                <User className="w-4 h-4" />
                <span className="text-sm font-medium">Пользователь:</span>
              </div>
              <h3 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors truncate" title={targetUser.username}>
                {targetUser.username}
              </h3>
            </div>
          </div>
          
          {/* Счетчик очков */}
          <div className="bg-gray-50 p-3 rounded-lg mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Очки подозрения</span>
              </div>
              <span className="text-lg font-bold text-gray-900">{totalPoints}</span>
            </div>
          </div>

          {/* Превью нарушений */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">
              Нарушений: {details.log.length}
            </p>
            <div className="text-sm text-gray-600 line-clamp-2">
              {details.log.slice(0, 2).map((entry, index) => (
                <div key={index} className="text-xs text-gray-500 mb-1">
                  • {entry.reason} (+{entry.points})
                </div>
              ))}
              {details.log.length > 2 && (
                <div className="text-xs text-gray-400">
                  и еще {details.log.length - 2}...
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              <span>IP: {details.ip}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400 group-hover:text-indigo-500 transition-colors">
              <span>Подробнее</span>
              <Eye size={16} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

const SystemReportsPage = () => {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('new');

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get(`/system-reports?status=${filter}`);
      setReports(data);
    } catch (error) {
      console.error("Ошибка при загрузке системных репортов:", error);
      toast.error('Не удалось загрузить системные репорты');
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleResolveReport = async (reportId) => {
    try {
      await api.post(`/system-reports/${reportId}/resolve`);
      toast.success('Репорт отмечен как рассмотренный');
      setReports(prevReports => prevReports.filter(r => r._id !== reportId));
    } catch (error) {
      console.error("Ошибка при разрешении репорта:", error);
      toast.error('Не удалось выполнить действие');
    }
  };

  const statusOptions = [
    { value: 'new', label: 'Новые' },
    { value: 'resolved', label: 'Рассмотренные' }
  ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Системные репорты</h1>
        </div>
        
        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
          <div className="flex gap-4">
            {statusOptions.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Контент */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Загрузка системных репортов...</p>
          </div>
        ) : (
          <>
            {reports.length > 0 ? (
              <AnimatePresence>
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  initial="hidden"
                  animate="visible"
                  variants={{
                    visible: {
                      transition: { staggerChildren: 0.05 },
                    },
                  }}
                >
                  {reports.map((report) => (
                    <motion.div
                      key={report._id}
                      variants={{
                        hidden: { y: 20, opacity: 0 },
                        visible: { y: 0, opacity: 1 },
                      }}
                      className="h-full"
                    >
                      <SystemReportCard report={report} onResolve={handleResolveReport} />
                    </motion.div>
                  ))}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow">
                <Hash size={48} className="mx-auto text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">
                  {filter === 'new' ? 'Все чисто!' : 'Нет рассмотренных репортов'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === 'new' ? 'Новых системных репортов нет.' : 'История пуста.'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SystemReportsPage;