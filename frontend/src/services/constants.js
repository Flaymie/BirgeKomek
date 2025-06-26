/**
 * Константы для использования во всем приложении
 */

// Список предметов для выбора
export const SUBJECTS = [
  'Математика',
  'Физика',
  'Химия',
  'Биология',
  'История',
  'География',
  'Литература',
  'Русский язык',
  'Казахский язык',
  'Английский язык',
  'Информатика',
  'Другое'
];

// Статусы запросов
export const REQUEST_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  // DELETED: 'deleted' // Можно добавить, если нужно обрабатывать на фронте
};

// Уровни срочности
export const URGENCY_LEVELS = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high'
};

// Названия статусов на русском
export const REQUEST_STATUS_LABELS = {
  [REQUEST_STATUSES.OPEN]: 'Открыта',
  [REQUEST_STATUSES.IN_PROGRESS]: 'В процессе',
  [REQUEST_STATUSES.COMPLETED]: 'Выполнена',
  [REQUEST_STATUSES.CLOSED]: 'Закрыта',
};

// Названия уровней срочности на русском
export const URGENCY_LABELS = {
  [URGENCY_LEVELS.LOW]: 'Низкая',
  [URGENCY_LEVELS.NORMAL]: 'Средняя',
  [URGENCY_LEVELS.HIGH]: 'Высокая'
};

// Цвета для статусов запросов
export const STATUS_COLORS = {
  [REQUEST_STATUSES.OPEN]: {
    bg: 'bg-green-100',
    text: 'text-green-800'
  },
  [REQUEST_STATUSES.IN_PROGRESS]: {
    bg: 'bg-blue-100',
    text: 'text-blue-800'
  },
  [REQUEST_STATUSES.CLOSED]: {
    bg: 'bg-gray-100',
    text: 'text-gray-800'
  },
  // Убираем стиль для CANCELLED
}; 