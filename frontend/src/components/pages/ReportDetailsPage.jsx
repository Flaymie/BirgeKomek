import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { reportsService, serverURL } from '../../services/api';
import { toast } from 'react-hot-toast';
import { FiUser, FiFileText, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiXCircle, FiPlayCircle, FiStar, FiCheckSquare, FiEdit, FiPaperclip, FiClock, FiCalendar, FiMessageCircle } from 'react-icons/fi';
import ImageViewerModal from '../modals/ImageViewerModal';
import ModeratorCommentModal from '../modals/ModeratorCommentModal';

const STATUS_LABELS = {
    open: 'Открыта',
    in_progress: 'В работе',
    resolved: 'Решена',
    rejected: 'Отклонена',
};

const STATUS_COLORS = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_ICONS = {
    open: FiClock,
    in_progress: FiPlayCircle,
    resolved: FiCheckCircle,
    rejected: FiXCircle,
};

// Мини-компонент для отображения объекта жалобы
const TargetInfoCard = ({ targetType, target }) => {
    if (!target) {
        return (
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiAlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="font-bold text-red-800 text-lg mb-2">Объект удален</h3>
                <p className="text-sm text-red-600 leading-relaxed">
                    {targetType === 'User' ? 'Пользователь' : 'Заявка'}, на которую была подана жалоба, больше не существует.
                </p>
            </div>
        );
    }

    if (targetType === 'User') {
        const isHelper = target.roles?.helper;

        return (
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FiUser className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Пользователь</h3>
                        <p className="text-sm text-gray-500">Профиль пользователя</p>
                    </div>
                </div>
                
                <Link to={`/profile/${target._id}`} className="font-semibold text-xl text-indigo-600 hover:text-indigo-700 hover:underline break-all transition-colors">
                    {target.username}
                </Link>
                <p className="text-sm text-gray-500 mt-2 mb-4 flex items-center gap-2">
                    <FiCalendar className="w-4 h-4" />
                    Зарегистрирован: {new Date(target.createdAt).toLocaleDateString()}
                </p>
                
                <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-600 mb-3">Статистика</h4>
                    <div className="space-y-3">
                        {isHelper ? (
                            <>
                                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FiStar className="w-4 h-4 text-yellow-500" />
                                        <span>Рейтинг:</span>
                                    </div>
                                    <span className="font-bold text-yellow-700">{target.rating?.toFixed(1) || 'Н/Д'}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                                    <div className="flex items-center gap-2 text-sm">
                                        <FiCheckSquare className="w-4 h-4 text-green-500" />
                                        <span>Выполнено:</span>
                                    </div>
                                    <span className="font-bold text-green-700">{target.completedRequests || 0}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                                <div className="flex items-center gap-2 text-sm">
                                    <FiEdit className="w-4 h-4 text-blue-500" />
                                    <span>Создано заявок:</span>
                                </div>
                                <span className="font-bold text-blue-700">{target.createdRequests || 0}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (targetType === 'Request') {
        return (
            <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200 hover:shadow-md transition-shadow h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FiFileText className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-gray-900">Заявка</h3>
                        <p className="text-sm text-gray-500">Объект жалобы</p>
                    </div>
                </div>
                
                <Link to={`/request/${target._id}`} className="font-semibold text-xl text-indigo-600 hover:text-indigo-700 hover:underline break-words transition-colors">
                    {target.title}
                </Link>
                <p className="text-sm text-gray-600 mt-3 line-clamp-3 max-h-32 overflow-y-auto leading-relaxed">
                    {target.description}
                </p>
            </div>
        );
    }

    return null;
};

// Мини-компонент для истории жалоб
const ComplaintHistory = ({ userId }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [expandedReport, setExpandedReport] = useState(null);

    useEffect(() => {
        if (!userId) return;
        const fetchHistory = async () => {
            try {
                setIsLoading(true);
                const res = await reportsService.getReportHistoryForUser(userId);
                const currentReportId = window.location.pathname.split('/').pop();
                setHistory(res.data.filter(r => r._id !== currentReportId));
            } catch (error) {
                console.error("Не удалось загрузить историю жалоб:", error);
                toast.error("Не удалось загрузить историю жалоб на пользователя.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchHistory();
    }, [userId]);

    const toggleExpanded = (reportId) => {
        setExpandedReport(expandedReport === reportId ? null : reportId);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
                <p className="text-sm text-gray-500">Загрузка истории...</p>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-6 text-center">
                <div className="w-16 h-16 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiCheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-green-800 text-lg mb-2">Чистая репутация!</h3>
                <p className="text-green-700 leading-relaxed">
                    На этого пользователя раньше не жаловались.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
                <FiClock className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">
                    Найдено жалоб: {history.length}
                </span>
            </div>
            
            {history.map(report => {
                const StatusIcon = STATUS_ICONS[report.status] || FiClock;
                const isExpanded = expandedReport === report._id;
                
                return (
                    <div key={report._id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200">
                        <div className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <StatusIcon className="w-5 h-5 text-gray-600" />
                                    </div>
                                    <div>
                                        <div className="flex items-center flex-wrap gap-x-2">
                                            <span className="font-semibold text-gray-900">
                                                {new Date(report.createdAt).toLocaleDateString('ru-RU')}
                                            </span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(report.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <span className="font-medium">От:</span>{' '}
                                            <Link 
                                                to={`/profile/${report.reporter?._id}`} 
                                                className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors break-all"
                                            >
                                                {report.reporter?.username || 'Аноним'}
                                            </Link>
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${STATUS_COLORS[report.status] || 'bg-gray-200 text-gray-700 border-gray-300'}`}>
                                        {STATUS_LABELS[report.status] || 'Неизвестен'}
                                    </span>
                                </div>
                            </div>
                            
                            <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <FiMessageCircle className="w-4 h-4 text-gray-500" />
                                    <span className="text-sm font-medium text-gray-700">Причина жалобы:</span>
                                </div>
                                <p className={`text-sm text-gray-800 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                                    {report.reason}
                                </p>
                                {report.reason.length > 100 && (
                                    <button
                                        onClick={() => toggleExpanded(report._id)}
                                        className="text-xs text-indigo-600 hover:text-indigo-700 mt-2 font-medium transition-colors"
                                    >
                                        {isExpanded ? 'Свернуть' : 'Показать полностью'}
                                    </button>
                                )}
                            </div>
                            
                            {report.moderatorComment && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FiUser className="w-4 h-4 text-blue-600" />
                                        <span className="text-sm font-medium text-blue-800">Комментарий модератора:</span>
                                    </div>
                                    <p className="text-sm text-blue-700 leading-relaxed">
                                        {report.moderatorComment}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ReportDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [viewerImageSrc, setViewerImageSrc] = useState(null);
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
    const [action, setAction] = useState({ status: '', title: '' });

    const fetchReport = useCallback(async () => {
        try {
            setLoading(true);
            const res = await reportsService.getReportById(id);
            setReport(res.data);
        } catch (err) {
            console.error("Ошибка при загрузке жалобы:", err);
            toast.error(err.response?.data?.msg || 'Не удалось загрузить жалобу.');
            setError('Жалоба не найдена или у вас нет доступа.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleUpdateStatus = async (status, moderatorComment) => {
        setIsUpdating(true);
        try {
            const res = await reportsService.updateReport(id, { status, moderatorComment });
            setReport(res.data);
            toast.success(`Статус жалобы обновлен на "${STATUS_LABELS[status]}"`);
        } catch (err) {
            console.error("Ошибка при обновлении статуса:", err);
            toast.error(err.response?.data?.msg || 'Не удалось обновить статус.');
        } finally {
            setIsUpdating(false);
        }
    };
    
    const openCommentModal = (status, title) => {
        setAction({ status, title });
        setIsCommentModalOpen(true);
    };

    const handleModalSubmit = async (comment) => {
        await handleUpdateStatus(action.status, comment);
        setIsCommentModalOpen(false);
    };

    const handleImageClick = (path) => {
        setViewerImageSrc(`${serverURL}/${path}`);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
                <p className="text-gray-500">Загрузка данных...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FiAlertCircle className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="text-xl font-semibold text-red-600 mb-4">{error}</h2>
                <Link to="/reports" className="btn btn-primary">Вернуться к списку</Link>
            </div>
        );
    }
    
    const statusClass = STATUS_COLORS[report.status] || 'bg-gray-200 text-gray-700 border-gray-300';
    const statusLabel = STATUS_LABELS[report.status] || 'Неизвестен';
    const StatusIcon = STATUS_ICONS[report.status] || FiClock;

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8">
                    <button 
                        onClick={() => navigate(-1)} 
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
                    >
                        <FiArrowLeft />
                        Назад к списку
                    </button>
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                Жалоба #{report._id.substring(0, 8)}
                            </h1>
                            <p className="text-gray-600">
                                Создана {new Date(report.createdAt).toLocaleDateString('ru-RU')}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <StatusIcon className="w-5 h-5 text-gray-600" />
                            <span className={`px-4 py-2 text-sm font-semibold rounded-full border ${statusClass}`}>
                                {statusLabel}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <FiFileText className="w-6 h-6 text-indigo-600" />
                            Детали жалобы
                        </h2>
                        
                        <div className="space-y-6 text-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium text-gray-500 mb-2">Подана на</p>
                                    <p className="font-semibold flex items-center gap-2">
                                        {report.targetType === 'User' ? <FiUser className="w-4 h-4" /> : <FiFileText className="w-4 h-4" />}
                                        {report.targetType === 'User' ? 'Пользователя' : 'Заявку'}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium text-gray-500 mb-2">Автор жалобы</p>
                                    <Link 
                                        to={`/profile/${report.reporter?._id}`} 
                                        className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors"
                                    >
                                        {report.reporter?.username || 'Аноним'}
                                    </Link>
                                </div>
                            </div>
                            
                            <div>
                                <p className="text-sm font-medium text-gray-500 mb-3">Причина жалобы</p>
                                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                                    <p className="whitespace-pre-wrap leading-relaxed">{report.reason}</p>
                                </div>
                            </div>
                            
                            {report.category && (
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-sm font-medium text-gray-500 mb-2">Категория</p>
                                    <p className="font-semibold">{report.category}</p>
                                </div>
                            )}
                            
                            {report.attachments && report.attachments.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                                        <FiPaperclip className="w-4 h-4" /> 
                                        Вложения ({report.attachments.length})
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                        {report.attachments.map((file, index) => (
                                            <div 
                                                key={index} 
                                                className="relative aspect-square cursor-pointer group rounded-lg overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors" 
                                                onClick={() => handleImageClick(file.path)}
                                            >
                                                <img 
                                                    src={`${serverURL}/${file.path}`} 
                                                    alt={`Вложение ${index + 1}`} 
                                                    className="w-full h-full object-cover"
                                                />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <p className="text-white text-xs text-center p-2 break-all">
                                                        {file.originalName}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 border-t pt-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FiEdit className="w-5 h-5 text-indigo-600" />
                                Действия модератора
                            </h3>
                            <div className="flex flex-wrap gap-3">
                                {report.status === 'open' && (
                                     <button 
                                        onClick={() => handleUpdateStatus('in_progress')} 
                                        disabled={isUpdating} 
                                        className="btn btn-secondary-outline gap-2"
                                    >
                                        <FiPlayCircle /> Взять в работу
                                    </button>
                                )}
                                {report.status === 'in_progress' && (
                                    <>
                                        <button 
                                            onClick={() => openCommentModal('resolved', 'Пометить жалобу решенной')} 
                                            disabled={isUpdating} 
                                            className="btn bg-green-500 hover:bg-green-600 text-white gap-2"
                                        >
                                            <FiCheckCircle /> Пометить решенной
                                        </button>
                                        <button 
                                            onClick={() => openCommentModal('rejected', 'Отклонить жалобу')} 
                                            disabled={isUpdating} 
                                            className="btn bg-red-500 hover:bg-red-600 text-white gap-2"
                                        >
                                            <FiXCircle /> Отклонить
                                        </button>
                                    </>
                                )}
                            </div>
                            {isUpdating && (
                                <div className="flex items-center gap-2 mt-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-600"></div>
                                    <p className="text-sm text-gray-500">Обновление...</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                             <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                <FiUser className="w-5 h-5 text-indigo-600" />
                                Объект жалобы
                            </h2>
                             <TargetInfoCard targetType={report.targetType} target={report.targetId} />
                        </div>

                        {report.targetType === 'User' && report.targetId && (
                            <div className="bg-white rounded-xl shadow-lg p-6">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                                    <FiClock className="w-5 h-5 text-indigo-600" />
                                    История жалоб
                                </h2>
                                <ComplaintHistory userId={report.targetId._id} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <ImageViewerModal
                src={viewerImageSrc}
                alt="Просмотр вложения"
                onClose={() => setViewerImageSrc(null)}
            />
            <ModeratorCommentModal
                isOpen={isCommentModalOpen}
                onClose={() => setIsCommentModalOpen(false)}
                onSubmit={handleModalSubmit}
                title={action.title}
            />
        </div>
    );
};

export default ReportDetailsPage;