import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { toast } from 'react-toastify';
import { FiUser, FiClipboard, FiPaperclip, FiCalendar, FiBookOpen, FiChevronsLeft, FiEdit, FiTrash2 } from 'react-icons/fi';
import ConfirmModal from '../../components/modals/ConfirmModal';

// -- Reusable Components --

const StatusBadge = ({ status }) => {
    const statusClasses = {
      open: 'bg-green-100 text-green-800', assigned: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800', completed: 'bg-indigo-100 text-indigo-800',
      cancelled: 'bg-red-100 text-red-800', closed: 'bg-gray-100 text-gray-800',
    };
    const statusText = {
        open: 'Открыта', assigned: 'Назначена', in_progress: 'В процессе',
        completed: 'Выполнена', cancelled: 'Отменена', closed: 'Закрыта',
    }
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
            {statusText[status] || status}
        </span>
    );
};

const DetailItem = ({ icon, label, children }) => (
    <div className="flex items-start py-2 border-b border-gray-100 last:border-b-0">
        <div className="text-gray-400 mr-4 mt-1">{icon}</div>
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <div className="text-md font-semibold text-gray-800">{children}</div>
        </div>
    </div>
);

const UserInfoCard = ({ user, title }) => {
    if (!user) {
        return (
             <div className="bg-white rounded-xl shadow-sm border p-4">
                <h3 className="font-bold text-gray-700 mb-2">{title}</h3>
                <div className="flex items-center text-gray-500">
                    <FiUser className="w-10 h-10 rounded-full mr-4 bg-gray-100 p-2"/>
                    <p>Не назначен</p>
                </div>
            </div>
        );
    }
    return (
        <div className="bg-white rounded-xl shadow-sm border p-4">
            <h3 className="font-bold text-gray-700 mb-4">{title}</h3>
            <div className="flex items-center">
                <img src={user.avatar || '/img/default-avatar.png'} alt={user.username} className="w-12 h-12 rounded-full mr-4 object-cover" />
                <div>
                    <Link to={`/admin/users/${user._id}`} className="font-bold text-indigo-600 hover:underline">{user.username}</Link>
                    {user.email && <p className="text-sm text-gray-500">{user.email}</p>}
                </div>
            </div>
        </div>
    );
};

const AttachmentsSection = ({ attachments }) => {
    if (!attachments || attachments.length === 0) return null;

    const baseUrl = process.env.REACT_APP_API_URL || '';

    return (
         <div className="mt-6 pt-4 border-t">
            <h3 className="font-bold text-gray-700 mb-3 flex items-center"><FiPaperclip className="mr-2"/> Вложения</h3>
            <ul className="space-y-2">
                {attachments.map(file => (
                    <li key={file._id} className="bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition-colors">
                        <a href={`${baseUrl}/uploads/attachments/${file.filename}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                            {file.originalName} ({Math.round(file.size / 1024)} KB)
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}

// -- Main Component --

const RequestDetailsAdminPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { callApi, loading } = useApi();
    const [request, setRequest] = useState(null);
    const [isConfirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        const fetchRequest = async () => {
            try {
                const { data } = await callApi(`/admin/requests/${id}`, 'GET');
                setRequest(data);
            } catch (error) {
                toast.error('Не удалось загрузить данные заявки.');
                console.error("Ошибка при загрузке заявки:", error);
            }
        };
        fetchRequest();
    }, [id, callApi]);

    const handleDelete = async () => {
        setActionLoading(true);
        try {
            await callApi(`/admin/requests/${id}`, 'DELETE');
            toast.success('Заявка успешно удалена.');
            navigate('/admin/requests');
        } catch (error) {
            toast.error('Не удалось удалить заявку.');
        } finally {
            setActionLoading(false);
            setConfirmDeleteOpen(false);
        }
    };

    if (loading) {
        return (
            <div>
                <div className="h-6 w-48 bg-gray-200 rounded-md mb-4 animate-pulse"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 animate-pulse">
                        <div className="h-8 w-3/4 bg-gray-200 rounded-md mb-4"></div>
                        <div className="h-4 w-full bg-gray-200 rounded-md mb-2"></div>
                        <div className="h-4 w-full bg-gray-200 rounded-md mb-2"></div>
                        <div className="h-4 w-1/2 bg-gray-200 rounded-md"></div>
                    </div>
                    <div className="space-y-6 animate-pulse">
                        <div className="h-48 bg-white rounded-xl shadow-sm p-6"></div>
                        <div className="h-24 bg-white rounded-xl shadow-sm p-6"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="text-center py-10">
                <h2 className="text-xl font-semibold text-red-600">Заявка не найдена</h2>
                <Link to="/admin/requests" className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                    <FiChevronsLeft className="mr-2"/> Вернуться к списку
                </Link>
            </div>
        );
    }

    return (
        <div>
            <Link to="/admin/requests" className="text-sm text-blue-600 hover:underline mb-4 inline-flex items-center">
                <FiChevronsLeft className="mr-1"/> К списку заявок
            </Link>

            {/* -- Edit/Delete Buttons -- */}
            <div className="flex justify-end gap-2 mb-4">
                <Link to={`/admin/requests/${id}/edit`} className="flex items-center px-3 py-2 text-sm bg-white border rounded-md hover:bg-gray-50">
                    <FiEdit className="mr-1"/> Редактировать
                </Link>
                <button onClick={() => setConfirmDeleteOpen(true)} className="flex items-center px-3 py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600">
                    <FiTrash2 className="mr-1"/> Удалить
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-xl shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
                           <h1 className="text-2xl font-bold text-gray-800 break-words">{request.title}</h1>
                           <div className="flex-shrink-0 mt-1 sm:mt-0">
                             <StatusBadge status={request.status} />
                           </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-4">Предмет: <strong>{request.subject}</strong> • Класс: <strong>{request.grade}</strong></p>
                        
                        <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
                            {request.description}
                        </div>
                        
                        <AttachmentsSection attachments={request.attachments} />
                    </div>
                </div>

                {/* Right Column */}
                <div>
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm p-6 border">
                             <h3 className="text-lg font-bold text-gray-700 mb-2">Детали</h3>
                             <DetailItem icon={<FiCalendar/>} label="Создана">
                                {new Date(request.createdAt).toLocaleString()}
                             </DetailItem>
                              <DetailItem icon={<FiCalendar/>} label="Обновлена">
                                {new Date(request.updatedAt).toLocaleString()}
                             </DetailItem>
                        </div>
                        <UserInfoCard user={request.author} title="Автор заявки" />
                        <UserInfoCard user={request.helper} title="Исполнитель" />
                    </div>
                </div>
            </div>

            {/* -- Modals -- */}
            <ConfirmModal
                isOpen={isConfirmDeleteOpen}
                onClose={() => setConfirmDeleteOpen(false)}
                onConfirm={handleDelete}
                title="Удалить заявку?"
                message="Вы уверены, что хотите удалить эту заявку? Все связанные с ней данные (сообщения, отзывы) также будут удалены. Это действие необратимо."
                loading={actionLoading}
            />
        </div>
    );
};

export default RequestDetailsAdminPage; 