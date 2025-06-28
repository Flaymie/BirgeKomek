import React from 'react';

// Набор сочных цветов для фона
const COLORS = [
  '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
  '#f43f5e'
];

/**
 * Генерирует стабильный цвет на основе строки (например, ника)
 * @param {string} str - Входная строка
 * @returns {string} - HEX-код цвета
 */
const getColorFromString = (str) => {
  if (!str) return COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLORS.length;
  return COLORS[index];
};

/**
 * Получает инициалы из имени пользователя
 * @param {string} name - Имя пользователя
 * @returns {string} - Две заглавные буквы
 */
const getInitials = (name) => {
  if (!name) return '??';
  
  const nameParts = name.replace(/[^a-zA-Zа-яА-Я0-9\s]/g, '').trim().split(/\s+/);

  if (nameParts.length > 1 && nameParts[0] && nameParts[1]) {
    return (nameParts[0][0] + nameParts[1][0]).toUpperCase();
  }
  
  if (nameParts.length > 0 && nameParts[0].length > 1) {
    return nameParts[0].substring(0, 2).toUpperCase();
  }
  
  return name.substring(0,2).toUpperCase() || '??';
};

/**
 * Компонент для отображения аватара пользователя.
 * Если есть URL аватара - показывает картинку.
 * Если нет - генерирует fallback-аватар с инициалами и цветным фоном.
 * @param {{
 *   username: string,
 *   avatarUrl?: string,
 *   className?: string
 * }} props
 */
const UserAvatar = ({ username, avatarUrl, className = 'w-10 h-10 text-base' }) => {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username}
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  const initials = getInitials(username);
  const backgroundColor = getColorFromString(username);

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white ${className}`}
      style={{ backgroundColor }}
      title={username}
    >
      <span>{initials}</span>
    </div>
  );
};

export default UserAvatar; 