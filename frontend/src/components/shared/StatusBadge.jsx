import React from 'react';

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