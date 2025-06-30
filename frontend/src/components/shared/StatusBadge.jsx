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
    default:
      return 'Неизвестно';
  }
};

// Компонент-обертка, который мы и будем использовать
const StatusBadge = ({ status }) => {
  return (
    <span
      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClass(status)}`}
    >
      {getStatusDisplayName(status)}
    </span>
  );
};

// Единственный экспорт по умолчанию
export default StatusBadge; 