import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { reportsService } from '../../services/api';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { FiSearch, FiTag, FiUser, FiFileText } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const STATUS_LABELS = {
    open: 'Открыт',
    in_progress: 'В работе',
    resolved: 'Решен',
    rejected: 'Отклонен',
};

const STATUS_COLORS = {
    open: { bg: 'bg-blue-100', text: 'text-blue-800' },
    in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    resolved: { bg: 'bg-green-100', text: 'text-green-800' },
    rejected: { bg: 'bg-red-100', text: 'text-red-800' },
};

const ReportCard = ({ report }) => {
    const statusClass = STATUS_COLORS[report.status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
    const statusLabel = STATUS_LABELS[report.status] || 'Неизвестен';

    const targetTypeText = report.targetType === 'User' ? 'Пользователь' : 'Заявка';
    const TargetIcon = report.targetType === 'User' ? FiUser : FiFileText;
    
    // Безопасный доступ к данным, которых может не быть
    const targetName = report.targetId?.username || report.targetId?.title || 'Объект удален';
    const reporterName = report.reporter?.username || 'Аноним';

    return (
        <Link to={`/reports/${report._id}`} className="block h-full">
            <div className="bg-white rounded-xl shadow-lg h-full flex flex-col overflow-hidden transform hover:-translate-y-1.5 transition-transform duration-300 ease-in-out group border-b-4 border-transparent hover:border-indigo-500">
                <div className="p-5 flex-grow">
                    <div className="flex justify-between items-start mb-3">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusClass.bg} ${statusClass.text}`}>
                            {statusLabel}
                        </span>
                        <span className="text-xs text-gray-500">
                            {new Date(report.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-gray-600 mb-2">
                         <TargetIcon className="w-4 h-4" />
                         <span className="text-sm font-medium">{targetTypeText}:</span>
                         <h3 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors truncate" title={targetName}>
                            {targetName}
                         </h3>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2">
                        {report.reason}
                    </p>
                </div>
                
                <div className="border-t border-gray-100 bg-gray-50 px-5 py-3">
                    <div className="flex justify-between items-center text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                            <FiTag className="w-3 h-3" />
                            <span>{report.category}</span>
                        </div>
                        <div>
                            <span>от </span>
                            <span className="font-semibold">{reporterName}</span>
                        </div>
                    </div>
                </div>
            </div>
        </Link>
    );
};


const ReportsPage = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({ search: '', status: 'all' });

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const res = await reportsService.getAllReports();
                setReports(res.data);
            } catch (err) {
                console.error("Ошибка при загрузке жалоб:", err);
                // Используем toast.error, так как он уже настроен в проекте
                toast.error(err.response?.data?.msg || 'Не удалось загрузить жалобы.');
                setError('Не удалось загрузить данные. Проверьте права доступа.');
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const filteredReports = useMemo(() => {
        return reports
            .filter(report => {
                if (filters.status === 'all') return true;
                return report.status === filters.status;
            })
            .filter(report => {
                const targetName = report.targetId?.username || report.targetId?.title || '';
                const reporterName = report.reporter?.username || '';
                const reason = report.reason || '';
                const lowercasedTerm = filters.search.toLowerCase();

                return targetName.toLowerCase().includes(lowercasedTerm) ||
                       reporterName.toLowerCase().includes(lowercasedTerm) ||
                       reason.toLowerCase().includes(lowercasedTerm);
            });
    }, [reports, filters]);

    const statusOptions = [
        { value: 'all', label: 'Все статусы' },
        { value: 'open', label: 'Открытые' },
        { value: 'in_progress', label: 'В работе' },
        { value: 'resolved', label: 'Решенные' },
        { value: 'rejected', label: 'Отклоненные' },
    ];

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Лента жалоб</h1>
            {/* Здесь может быть кнопка, например, "Статистика" */}
        </div>
      
        <div className="bg-white rounded-xl shadow-sm p-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                    <label htmlFor="search" className="sr-only">Поиск</label>
                    <FiSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        id="search"
                        name="search"
                        value={filters.search}
                        onChange={handleFilterChange}
                        placeholder="Поиск по цели, автору, причине..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                </div>
                
                <div className="w-full">
                    <label htmlFor="status" className="sr-only">Статус</label>
                    <select
                        id="status"
                        name="status"
                        value={filters.status}
                        onChange={handleFilterChange}
                        className="w-full py-2 rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg">
                <p>{error}</p>
            </div>
        )}

        {loading ? (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Загрузка жалоб...</p>
            </div>
        ) : (
            <>
                {filteredReports.length > 0 ? (
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
                            {filteredReports.map((report) => (
                                <motion.div
                                    key={report._id}
                                    variants={{
                                        hidden: { y: 20, opacity: 0 },
                                        visible: { y: 0, opacity: 1 },
                                    }}
                                    className="h-full"
                                >
                                    <ReportCard report={report} />
                                </motion.div>
                            ))}
                        </motion.div>
                    </AnimatePresence>
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl shadow">
                        <h3 className="text-xl font-semibold text-gray-700">Жалобы не найдены</h3>
                        <p className="text-gray-500 mt-2">Попробуйте изменить фильтры. Возможно, все чисто!</p>
                    </div>
                )}
                {/* Здесь можно будет добавить пагинацию */}
            </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;

