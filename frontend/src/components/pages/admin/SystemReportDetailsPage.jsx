import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, usersService } from '../../../services/api';
import { toast } from 'react-hot-toast';
import { FiUser, FiArrowLeft, FiAlertCircle, FiCheckCircle, FiShield, FiXCircle, FiClock, FiList, FiHome, FiGlobe, FiInfo } from 'react-icons/fi';
import BanUserModal from '../../modals/BanUserModal'; 
import ModeratorCommentModal from '../../modals/ModeratorCommentModal';

const STATUS_LABELS = {
  new: 'Новый',
  resolved: 'Рассмотрен',
};

const STATUS_COLORS = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
};

const STATUS_ICONS = {
  new: FiAlertCircle,
  resolved: FiCheckCircle,
};

const UserDetailCard = ({ user }) => {
  if (!user) return null;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border border-gray-200">
      <div className="flex items-center gap-4 mb-4">
        <img src={user.avatar || '/img/default-avatar.png'} alt={user.username} className="w-16 h-16 rounded-full border-2 border-indigo-200" />
        <div>
          <Link to={`/profile/${user._id}`} className="font-bold text-xl text-indigo-600 hover:text-indigo-700 hover:underline transition-colors">
            {user.username}
          </Link>
          <div className="flex items-center gap-2 mt-1">
            {user.roles.admin && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-700">Админ</span>}
            {user.roles.moderator && <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700">Модер</span>}
          </div>
        </div>
      </div>
       <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-semibold text-gray-600 mb-3">Информация</h4>
          <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gray-100 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                      <FiInfo className="w-4 h-4 text-gray-500" />
                      <span>Очки подозрения:</span>
                  </div>
                  <span className="font-bold text-gray-700">{user.suspicionScore}</span>
              </div>
          </div>
       </div>
    </div>
  );
};

const SystemReportDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isBanModalOpen, setBanModalOpen] = useState(false);
    const [isResolveModalOpen, setResolveModalOpen] = useState(false);
    
    const fetchReport = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/system-reports/${id}`);
            setReport(data);
        } catch (err) {
            console.error("Ошибка при загрузке системного репорта:", err);
            toast.error(err.response?.data?.msg || 'Не удалось загрузить репорт.');
            setError('Репорт не найден или у вас нет доступа.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    const handleBanUser = async (reason, duration) => {
        if (!report?.targetUser?._id) {
            toast.error('Не удалось определить пользователя для бана.');
            return;
        }
        setIsUpdating(true);
        try {
            await usersService.banUser(report.targetUser._id, reason, duration);
            toast.success(`Пользователь ${report.targetUser.username} успешно забанен.`);
            setBanModalOpen(false);
            fetchReport(); // Обновляем инфу на странице
        } catch (error) {
            toast.error(error.response?.data?.msg || 'Ошибка при бане пользователя.');
            console.error(error);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleResolve = async (notes) => {
        setIsUpdating(true);
        try {
            const { data } = await api.post(`/system-reports/${report._id}/resolve`, { notes });
            setReport(data);
            toast.success('Репорт отмечен как рассмотренный');
        } catch (err) {
            toast.error(err.response?.data?.msg || 'Не удалось обновить статус.');
        } finally {
            setIsUpdating(false);
            setResolveModalOpen(false);
        }
    };

    if (loading) return <div className="text-center py-20">Загрузка...</div>;
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>;

    const { targetUser, details, status, createdAt } = report;
    const StatusIcon = STATUS_ICONS[status] || FiClock;
    const statusClass = STATUS_COLORS[status] || 'bg-gray-200 text-gray-700 border-gray-300';

    // Безопасно достаем ipInfo
    const ipInfo = targetUser?.registrationDetails?.ipInfo || {};
    
    return (
        <div className="bg-gray-50 min-h-screen">
            <div className="container mx-auto px-4 py-8">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6">
                    <FiArrowLeft /> Назад к списку
                </button>

                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Системный репорт #{report._id.substring(0, 8)}</h1>
                        <p className="text-gray-600">Создан {new Date(createdAt).toLocaleString('ru-RU')}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusIcon className={`w-5 h-5 ${STATUS_COLORS[status]?.text || 'text-gray-600'}`} />
                        <span className={`px-4 py-2 text-sm font-semibold rounded-full border ${statusClass}`}>
                            {STATUS_LABELS[status]}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-8">
                        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                            <FiList className="w-6 h-6 text-indigo-600" /> Детали подозрительной активности
                        </h2>
                        <div className="space-y-3">
                            {details.log.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="text-gray-800">{item.reason}</p>
                                    <span className="font-bold text-lg text-gray-900">+{item.points}</span>
                                </div>
                            ))}
                        </div>
                        <div className="mt-4 pt-4 border-t flex items-center justify-end">
                            <p className="text-sm text-gray-500">Итого:</p>
                            <p className="text-2xl font-bold text-gray-900 ml-2">{details.score}</p>
                        </div>

                         <div className="mt-8 border-t pt-6">
                             <h3 className="text-lg font-bold mb-4">Действия</h3>
                             {status === 'new' && (
                                 <div className="flex flex-wrap gap-3">
                                     <button onClick={() => setResolveModalOpen(true)} className="btn bg-green-500 hover:bg-green-600 text-white gap-2">
                                         <FiCheckCircle /> Рассмотрено
                                     </button>
                                     <button onClick={() => setBanModalOpen(true)} className="btn bg-red-500 hover:bg-red-600 text-white gap-2">
                                         <FiShield /> Забанить
                                     </button>
                                 </div>
                             )}
                              {status === 'resolved' && (
                                <p className="text-sm text-gray-500">Репорт был рассмотрен {report.resolvedBy ? `пользователем ${report.resolvedBy.username}` : ''}.</p>
                             )}
                         </div>

                    </div>
                    <div className="space-y-8">
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-bold mb-6">Пользователь</h2>
                            <UserDetailCard user={targetUser} />
                        </div>
                        <div className="bg-white rounded-xl shadow-lg p-6">
                            <h2 className="text-xl font-bold mb-6">IP Инфо</h2>
                             <div className="space-y-3 text-sm">
                                <div className="flex items-center gap-2"><FiGlobe className="text-gray-400"/> IP: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{details.ip}</span></div>
                                <div className="flex items-center gap-2"><FiHome className="text-gray-400"/> Местоположение: <span className="font-medium">{ipInfo.city || 'N/A'}, {ipInfo.country || 'N/A'}</span></div>
                                <div className="flex items-center gap-2">{ipInfo.isHosting ? <FiShield className="text-red-500"/> : <FiShield className="text-green-500"/>} Хостинг/VPN: <span className="font-medium">{ipInfo.isHosting ? 'Да' : 'Нет'}</span></div>
                                <div className="flex items-center gap-2">{ipInfo.isProxy ? <FiShield className="text-red-500"/> : <FiShield className="text-green-500"/>} Прокси: <span className="font-medium">{ipInfo.isProxy ? 'Да' : 'Нет'}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {targetUser && (
                <BanUserModal
                    isOpen={isBanModalOpen}
                    onClose={() => setBanModalOpen(false)}
                    onConfirm={handleBanUser}
                    username={targetUser.username}
                />
            )}
            
            <ModeratorCommentModal
                isOpen={isResolveModalOpen}
                onClose={() => setResolveModalOpen(false)}
                onSubmit={handleResolve}
                title="Завершить рассмотрение репорта"
                submitText="Рассмотрено"
            />
        </div>
    );
};

export default SystemReportDetailsPage; 