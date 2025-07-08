import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { reportsService, serverURL } from '../../services/api';
import { toast } from 'react-hot-toast';
import { FiUser, FiFileText, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiXCircle, FiPlayCircle, FiStar, FiCheckSquare, FiEdit, FiPaperclip } from 'react-icons/fi';
import ImageViewerModal from '../modals/ImageViewerModal';
import ModeratorCommentModal from '../modals/ModeratorCommentModal';

const STATUS_LABELS = {
    open: 'Открыта',
    in_progress: 'В работе',
    resolved: 'Решена',
    rejected: 'Отклонена',
};

const STATUS_COLORS = {
    open: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
};

// --- Мини-компонент для отображения объекта жалобы ---
const TargetInfoCard = ({ targetType, target }) => {
    if (!target) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <FiAlertCircle className="mx-auto h-8 w-8 text-red-500 mb-2" />
                <h3 className="font-bold text-red-800">Объект удален</h3>
                <p className="text-sm text-red-600">
                    {targetType === 'User' ? 'Пользователь' : 'Заявка'}, на которую была подана жалоба, больше не существует.
                </p>
            </div>
        );
    }

    if (targetType === 'User') {
        const isHelper = target.roles?.helper;

        return (
            <div className="bg-white p-4 rounded-lg border flex flex-col">
                <h3 className="font-bold text-lg mb-2">Пользователь</h3>
                <Link to={`/profile/${target._id}`} className="font-semibold text-xl text-indigo-600 hover:underline break-all">{target.username}</Link>
                <p className="text-sm text-gray-500 mt-1 mb-4">Зарегистрирован: {new Date(target.createdAt).toLocaleDateString()}</p>
                
                <div className="pt-4 border-t border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2">Статистика</h4>
                    <div className="space-y-2">
                        {isHelper ? (
                            <>
                                <div className="flex items-center gap-2 text-sm">
                                    <FiStar className="w-4 h-4 text-yellow-500" />
                                    <span>Рейтинг:</span>
                                    <span className="font-bold text-gray-800">{target.rating?.toFixed(1) || 'Н/Д'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    <FiCheckSquare className="w-4 h-4 text-green-500" />
                                    <span>Выполнено:</span>
                                    <span className="font-bold text-gray-800">{target.completedRequests || 0}</span>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-2 text-sm">
                                <FiEdit className="w-4 h-4 text-blue-500" />
                                <span>Создано заявок:</span>
                                <span className="font-bold text-gray-800">{target.createdRequests || 0}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (targetType === 'Request') {
        return (
            <div className="bg-white p-4 rounded-lg border h-full flex flex-col">
                <h3 className="font-bold text-lg mb-2">Заявка</h3>
                <Link to={`/request/${target._id}`} className="font-semibold text-xl text-indigo-600 hover:underline break-words">{target.title}</Link>
                <p className="text-sm text-gray-600 mt-2 line-clamp-3 max-h-32 overflow-y-auto">{target.description}</p>
            </div>
        );
    }

    return null;
};

// --- Мини-компонент для истории жалоб ---
const ComplaintHistory = ({ userId }) => {
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;
        const fetchHistory = async () => {
            try {
                setIsLoading(true);
                const res = await reportsService.getReportHistoryForUser(userId);
                // Фильтруем текущий репорт из истории, чтобы не дублировать
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

    if (isLoading) {
        return <div className="text-center py-4"><p className="text-sm text-gray-500">Загрузка истории...</p></div>;
    }

    if (history.length === 0) {
        return (
            <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg text-center">
                <p>На этого пользователя раньше не жаловались. Чистая репутация!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {history.map(report => (
                 <div key={report._id} className="bg-gray-50 p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-semibold">{new Date(report.createdAt).toLocaleDateString('ru-RU')}</span>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${STATUS_COLORS[report.status] || 'bg-gray-200'}`}>
                            {STATUS_LABELS[report.status] || 'Неизвестен'}
                        </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">От:</span> <Link to={`/profile/${report.reporter?._id}`} className="text-indigo-600 hover:underline">{report.reporter?.username || 'Аноним'}</Link>
                    </p>
                     <p className="text-sm text-gray-800 bg-white p-2 rounded whitespace-pre-wrap border">{report.reason}</p>
                 </div>
            ))}
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
        return <div className="text-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto"></div></div>;
    }

    if (error) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-red-600">{error}</h2>
                <Link to="/reports" className="mt-4 inline-block btn btn-primary">Вернуться к списку</Link>
            </div>
        );
    }
    
    const statusClass = STATUS_COLORS[report.status] || 'bg-gray-200';
    const statusLabel = STATUS_LABELS[report.status] || 'Неизвестен';

    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                {/* Шапка */}
                <div className="mb-6">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-4">
                        <FiArrowLeft />
                        Назад к списку
                    </button>
                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-gray-900">Жалоба #{report._id.substring(0, 8)}</h1>
                        <span className={`px-4 py-1.5 text-sm font-semibold rounded-full ${statusClass}`}>
                            {statusLabel}
                        </span>
                    </div>
                </div>

                {/* Основной контент */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Левая колонка - детали и действия */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-md p-6">
                        <h2 className="text-xl font-bold mb-4 border-b pb-3">Детали жалобы</h2>
                        
                        <div className="space-y-4 text-gray-700">
                            <div>
                                <p className="text-sm font-medium text-gray-500">Подана на</p>
                                <p className="font-semibold flex items-center gap-2">
                                    {report.targetType === 'User' ? <FiUser /> : <FiFileText />}
                                    {report.targetType === 'User' ? 'Пользователя' : 'Заявку'}
                                </p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Автор жалобы</p>
                                <Link to={`/profile/${report.reporter?._id}`} className="font-semibold text-indigo-600 hover:underline">{report.reporter?.username || 'Аноним'}</Link>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Дата</p>
                                <p className="font-semibold">{new Date(report.createdAt).toLocaleString('ru-RU')}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">Причина</p>
                                <p className="font-semibold bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{report.reason}</p>
                            </div>
                            {report.category && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Категория</p>
                                    <p className="font-semibold">{report.category}</p>
                                </div>
                            )}
                            {report.attachments && report.attachments.length > 0 && (
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2"><FiPaperclip /> Вложения</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {report.attachments.map((file, index) => (
                                            <div key={index} className="relative aspect-square cursor-pointer group" onClick={() => handleImageClick(file.path)}>
                                                <img 
                                                    src={`${serverURL}/${file.path}`} 
                                                    alt={`Вложение ${index + 1}`} 
                                                    className="w-full h-full object-cover rounded-lg border border-gray-200"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                                    <p className="text-white text-xs text-center p-1 break-all">{file.originalName}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 border-t pt-6">
                            <h3 className="text-lg font-bold mb-3">Действия модератора</h3>
                            <div className="flex flex-wrap gap-3">
                                {report.status === 'open' && (
                                     <button onClick={() => handleUpdateStatus('in_progress')} disabled={isUpdating} className="btn btn-secondary-outline gap-2">
                                        <FiPlayCircle /> Взять в работу
                                    </button>
                                )}
                                {report.status === 'in_progress' && (
                                    <>
                                        <button onClick={() => openCommentModal('resolved', 'Пометить жалобу решенной')} disabled={isUpdating} className="btn bg-green-500 hover:bg-green-600 text-white gap-2">
                                            <FiCheckCircle /> Пометить решенной
                                        </button>
                                        <button onClick={() => openCommentModal('rejected', 'Отклонить жалобу')} disabled={isUpdating} className="btn bg-red-500 hover:bg-red-600 text-white gap-2">
                                            <FiXCircle /> Отклонить
                                        </button>
                                    </>
                                )}
                            </div>
                            {isUpdating && <p className="text-sm text-gray-500 mt-2">Обновление...</p>}
                        </div>
                    </div>

                    {/* Правая колонка - объект жалобы */}
                    <div className="bg-white rounded-xl shadow-md p-6 flex flex-col min-h-0">
                         <h2 className="text-xl font-bold mb-4 border-b pb-3">Объект жалобы</h2>
                         <TargetInfoCard targetType={report.targetType} target={report.targetId} />
                    </div>

                    {/* --- НОВАЯ СЕКЦИЯ: ИСТОРИЯ ЖАЛОБ --- */}
                    {report.targetType === 'User' && report.targetId && (
                        <div className="bg-white rounded-xl shadow-md p-6">
                            <h2 className="text-xl font-bold mb-4 border-b pb-3">История жалоб на пользователя</h2>
                            <ComplaintHistory userId={report.targetId._id} />
                        </div>
                    )}
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