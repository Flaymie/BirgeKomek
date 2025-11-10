import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { statsService, requestsService } from '../../services/api';
import { FiArrowRight, FiBookOpen, FiCheckSquare, FiPlusCircle, FiStar, FiEdit, FiList, FiUser, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import StatusBadge from '../shared/StatusBadge';
import CreateRequestModal from '../modals/CreateRequestModal';

const StatCardSkeleton = () => (
    <div className="bg-white p-6 rounded-xl shadow-md animate-pulse">
        <div className="h-8 bg-gray-200 rounded-md w-1/2 mb-3"></div>
        <div className="h-5 bg-gray-200 rounded-md w-3/4"></div>
    </div>
);

// Удаляем старые массивы фраз, они больше не нужны
// const helperWelcomePhrases = [...];
// const studentWelcomePhrases = [...];
// const genericWelcomePhrases = [...];

const getRandomPhrase = (phrases, replacements = {}) => {
    if (!phrases || phrases.length === 0) return "";
    let phrase = phrases[Math.floor(Math.random() * phrases.length)];
    for (const key in replacements) {
        phrase = phrase.replace(`{${key}}`, replacements[key]);
    }
    return phrase;
};


const ActivityItemSkeleton = () => (
    <li className="p-4 border rounded-lg animate-pulse">
        <div className="flex justify-between items-center">
            <div>
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
        </div>
    </li>
);

const UserDashboard = () => {
    const { currentUser } = useAuth();
    const [generalStats, setGeneralStats] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [relevantRequests, setRelevantRequests] = useState([]);
    const [activitySummary, setActivitySummary] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [generalRes, userRes, activityRes, , requestsRes] = await Promise.allSettled([
                statsService.getGeneralStats(),
                currentUser?._id ? statsService.getUserStats(currentUser._id) : Promise.resolve(null),
                currentUser?._id ? statsService.getActivitySummary(currentUser._id) : Promise.resolve(null),
                currentUser?._id ? statsService.getPendingReviews(currentUser._id) : Promise.resolve(null),
                (currentUser?.roles?.helper && currentUser?.subjects?.length > 0)
                    ? requestsService.getRequests({
                        limit: 5,
                        status: 'open',
                        subjects: currentUser.subjects.join(','),
                        excludeAuthor: currentUser._id
                      })
                    : Promise.resolve(null)
            ]);

            if (generalRes.status === 'fulfilled') setGeneralStats(generalRes.value.data);
            if (userRes.status === 'fulfilled' && userRes.value) setUserStats(userRes.value.data);
            if (activityRes.status === 'fulfilled' && activityRes.value) setActivitySummary(activityRes.value.data);
            if (requestsRes.status === 'fulfilled' && requestsRes.value) setRelevantRequests(requestsRes.value.data.requests);

        } catch (error) {
            console.error("Ошибка при загрузке данных для дашборда:", error);
            toast.error("Не удалось загрузить данные. Попробуйте обновить страницу.");
        }
    }, [currentUser]);

    useEffect(() => {
        const initialLoad = async () => {
            setLoading(true);
            await fetchData();
            setLoading(false);
        };
        initialLoad();
    }, [fetchData]);

    const handleRequestCreated = () => {
        fetchData();
    };

    const StatCard = ({ icon, label, value, colorClass }) => (
        <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300">
            <div className={`text-3xl mb-3 ${colorClass}`}>{icon}</div>
            <div className="text-3xl font-bold text-gray-800">{value}</div>
            <p className="text-gray-500">{label}</p>
        </div>
    );
    
    const getPersonalizedMessage = (user, stats) => {
        const genericWelcomePhrases = [
            "Рады видеть вас на платформе!",
            "Добро пожаловать! Готовы к новым свершениям?",
            "Привет! Чем займемся сегодня?",
            "С возвращением! Надеемся, у вас продуктивный день."
        ];

        if (!user || !stats) {
            return getRandomPhrase(genericWelcomePhrases);
        }

        // --- Логика для Хелпера ---
        if (user.roles?.helper && stats.completedRequestsAsHelper > 0) {
            const count = stats.completedRequestsAsHelper;
            // const rating = stats.averageRatingAsHelper > 0 ? stats.averageRatingAsHelper.toFixed(1) : null;
            
            const milestones = {
                100: `${count} заявок! Ты — магистр помощи!`,
                50: `${count} решенных вопросов! Настоящая легенда!`,
                25: `${count} заявок выполнено! Ты на полпути к супергерою!`,
                10: `${count} добрых дел! Ты уже опытный помощник.`,
                5: `${count} заявок! Врываешься как профи.`,
                1: `${count} выполненная заявка! Отличное начало!`
            };
            
            let message = milestones[count]; // Проверяем точное совпадение с майлстоуном

            if (!message) {
                // Если не майлстоун, используем бодрые общие фразы
                const genericHelperPhrases = [
                    "{count} добрых дел — ты на высоте!",
                    "{count} заявок — спасибо за помощь!",
                    "{count} заявок позади, ты не остановим!",
                    "{count} раз помогли. Так держать!",
                ];
                message = getRandomPhrase(genericHelperPhrases, { count });
            }
            return message;
        }

        // --- Логика для Студента ---
        if (user.roles?.student && stats.createdRequests > 0) {
            const count = stats.createdRequests;
            const milestones = {
                50: `${count} заявок! Настоящий искатель знаний!`,
                25: `${count} вопросов! Твоя жажда знаний впечатляет.`,
                10: `Уже ${count} вопросов! Так держать.`,
                5: `${count} заявок! Любознательность — это сила!`,
                1: `Первый вопрос задан! Отличное начало.`
            };

            let message = milestones[count];

            if (!message) {
                 const genericStudentPhrases = [
                    "Вы создали {count} запросов. Отличная работа!",
                    "Любознательность — ваше второе имя! Уже {count} созданных запросов.",
                    "{count} вопросов задано. Путь к знаниям открыт!",
                ];
                message = getRandomPhrase(genericStudentPhrases, { count });
            }
            return message;
        }

        // Общий случай для всех остальных
        return getRandomPhrase(genericWelcomePhrases);
    };

    return (
        <div className="container-custom py-12 animate-fadeIn">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
                С возвращением, {currentUser.username}!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
                {loading ? 'Загружаем вашу статистику...' : getPersonalizedMessage(currentUser, userStats)}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
                ) : (
                    <>
                        <StatCard icon={<FiBookOpen />} label="Активных заявок на сайте" value={generalStats?.activeRequests || 0} colorClass="text-blue-500" />
                        <StatCard icon={<FiCheckSquare />} label="Всего выполнено" value={generalStats?.completedRequests || 0} colorClass="text-green-500" />
                        {userStats?.averageRatingAsHelper !== null && (
                            <StatCard icon={<FiStar />} label="Ваш рейтинг" value={userStats?.averageRatingAsHelper.toFixed(1) || 'N/A'} colorClass="text-yellow-500" />
                        )}
                        {currentUser.roles?.student && (
                             <StatCard icon={<FiEdit />} label="Вы создали запросов" value={userStats?.createdRequests || 0} colorClass="text-indigo-500" />
                        )}
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow-md">
                    <h3 className="text-xl font-bold mb-4">Быстрые действия</h3>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => setCreateModalOpen(true)} className="btn btn-secondary w-full flex items-center justify-center gap-2">
                            <FiPlusCircle /> Создать запрос
                        </button>
                        <Link to="/my-requests" className="btn btn-secondary w-full flex items-center justify-center gap-2">
                            <FiList /> Мои запросы
                        </Link>
                         <Link to="/profile/me" className="btn btn-secondary w-full flex items-center justify-center gap-2">
                            <FiUser /> Мой профиль
                        </Link>
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                    {currentUser.roles?.helper && relevantRequests.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-md">
                            <h3 className="text-xl font-bold mb-4">Актуальные запросы для вас</h3>
                            {loading ? (
                                <ul className="space-y-4">
                                    {Array.from({ length: 3 }).map((_, i) => <ActivityItemSkeleton key={i} />)}
                                </ul>
                            ) : relevantRequests.length > 0 ? (
                                <ul className="space-y-4">
                                    {relevantRequests.map(req => (
                                        <li key={req._id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                            <Link to={`/request/${req._id}`} className="flex justify-between items-center">
                                                <div>
                                                    <p className="font-semibold text-primary-700">{req.title}</p>
                                                    <p className="text-sm text-gray-500">
                                                        {req.subject} • {req.grade} класс
                                                    </p>
                                                </div>
                                                <FiArrowRight className="text-gray-400" />
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-600">Сейчас нет открытых запросов по вашим предметам. Загляните позже!</p>
                            )}
                        </div>
                    )}

                    {/* Блок недавней активности */}
                    <div className="bg-white p-6 rounded-xl shadow-md">
                        <h3 className="text-xl font-bold mb-4">Недавняя активность</h3>
                        {loading ? (
                            <ul className="space-y-4">
                                {Array.from({ length: 3 }).map((_, i) => <ActivityItemSkeleton key={i} />)}
                            </ul>
                        ) : activitySummary.length > 0 ? (
                            <ul className="space-y-4">
                                {activitySummary.map(act => {
                                const parsedDate = new Date(act.updatedAt);
                                const timeAgo = !isNaN(parsedDate)
                                    ? formatDistanceToNow(parsedDate, { addSuffix: true, locale: ru })
                                    : 'неизвестно когда';

                                return (
                                    <li key={act._id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                                        <Link to={`/request/${act._id}`} className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-gray-800">{act.title}</p>
                                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                                    <FiClock className="text-xs" />
                                                    {`Обновлено ${timeAgo}`}
                                                    <StatusBadge status={act.status} />
                                                </p>
                                            </div>
                                            <FiArrowRight className="text-gray-400" />
                                        </Link>
                                    </li>
                                );
                            })}
                            </ul>
                        ) : (
                            <p className="text-gray-600">Ваша недавняя активность будет отображаться здесь.</p>
                        )}
                    </div>
                    
                </div>
            </div>
            <CreateRequestModal 
                isOpen={isCreateModalOpen}
                onClose={() => setCreateModalOpen(false)}
                onSuccess={handleRequestCreated}
            />
        </div>
    );
};

export default UserDashboard;