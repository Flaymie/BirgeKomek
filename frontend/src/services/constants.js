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

export const REQUEST_STATUSES = {
  OPEN: 'open',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  CANCELLED: 'cancelled'
};

export const REQUEST_STATUS_LABELS = {
  [REQUEST_STATUSES.OPEN]: 'Открыта',
  [REQUEST_STATUSES.ASSIGNED]: 'Назначена',
  [REQUEST_STATUSES.IN_PROGRESS]: 'В процессе',
  [REQUEST_STATUSES.PENDING]: 'В ожидании',
  [REQUEST_STATUSES.COMPLETED]: 'Завершена',
  [REQUEST_STATUSES.CLOSED]: 'Закрыта',
  [REQUEST_STATUSES.CANCELLED]: 'Отменена'
};

export const STATUS_COLORS = {
  [REQUEST_STATUSES.OPEN]: {
    bg: 'bg-blue-100',
    text: 'text-blue-800'
  },
  [REQUEST_STATUSES.ASSIGNED]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800'
  },
  [REQUEST_STATUSES.IN_PROGRESS]: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800'
  },
  [REQUEST_STATUSES.PENDING]: {
    bg: 'bg-orange-100',
    text: 'text-orange-800'
  },
  [REQUEST_STATUSES.COMPLETED]: {
    bg: 'bg-green-100',
    text: 'text-green-800'
  },
  [REQUEST_STATUSES.CLOSED]: {
    bg: 'bg-gray-200',
    text: 'text-gray-800'
  },
  [REQUEST_STATUSES.CANCELLED]: {
    bg: 'bg-red-100',
    text: 'text-red-800'
  }
}; 