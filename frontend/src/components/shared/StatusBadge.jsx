import React from 'react';

// Эти функции остаются локальными, они не экспортируются
const getStatusColorClass = (status) => {
  switch (status) {
    case 'open':
      return 'bg-blue-100 text-blue-800';
    case 'assigned':
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800';
    case 'pending':
      return 'bg-orange-100 text-orange-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'closed':
      return 'bg-gray-200 text-gray-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    case 'draft':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};

const getStatusDisplayName = (status) => {
  switch (status) {
    case 'open':
      return 'Открыта';
    case 'assigned':
      return 'Назначена';
    case 'in_progress':
      return 'В процессе';
    case 'pending':
      return 'В ожидании';
    case 'completed':
      return 'Завершена'; // Убедимся, что здесь правильный текст
    case 'closed':
      return 'Закрыта';
    case 'cancelled':
      return 'Отменена';
    case 'draft':
      return 'Черновик';
    default:
      return 'Неизвестно';
  }
};

// Компонент-обертка, который мы и будем использовать
const StatusBadge = ({ status }) => {
  const statusMap = {
    open: { text: 'Открыта', color: 'bg-blue-100 text-blue-800' },
    assigned: { text: 'Назначена', color: 'bg-yellow-100 text-yellow-800' },
    in_progress: { text: 'В процессе', color: 'bg-yellow-100 text-yellow-800' },
    pending: { text: 'В ожидании', color: 'bg-orange-100 text-orange-800' },
    completed: { text: 'Завершена', color: 'bg-green-100 text-green-800' },
    closed: { text: 'Закрыта', color: 'bg-gray-200 text-gray-800' },
    cancelled: { text: 'Отменена', color: 'bg-red-100 text-red-800' },
    draft: { text: 'Черновик', color: 'bg-purple-100 text-purple-800' },
    default: { text: 'Неизвестно', color: 'bg-gray-100 text-gray-600' },
  };

  const { text, color } = statusMap[status] || statusMap.default;

  return (
    <span className={`px-2.5 py-1 text-sm font-medium rounded-full ${color} whitespace-nowrap`}>
      {text}
    </span>
  );
};

// Единственный экспорт по умолчанию
export default StatusBadge; 