import { serverURL } from './api';

/**
 * Форматирует URL аватара. Принимает либо объект пользователя, либо строку с путем.
 * @param {object|string} data - Объект пользователя ({ avatar: 'path' }) или строка-путь
 * @returns {string|null} Полный URL аватара или null
 */
export const formatAvatarUrl = (data) => {
  let avatarPath = '';

  // Если ничего не передали, выходим
  if (!data) return null;

  // Определяем, что нам передали - строку или объект
  if (typeof data === 'string') {
    avatarPath = data;
  } else if (typeof data === 'object' && data.avatar) {
    avatarPath = data.avatar;
  } else {
    // Если формат не тот, или аватара нет
    return null;
  }
  
  // Если аватар уже полный URL (например, из Google/etc), возвращаем его как есть
  if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
    return avatarPath;
  }
  
  // Если аватар - это base64 строка, возвращаем ее же
  if (avatarPath.startsWith('data:image')) {
    return avatarPath;
  }

  // Если аватар - это путь на нашем сервере
  if (avatarPath.startsWith('uploads/') || avatarPath.startsWith('/uploads/')) {
    const cleanAvatarPath = avatarPath.startsWith('/') ? avatarPath.substring(1) : avatarPath;
    // ИСПОЛЬЗУЕМ ПРАВИЛЬНЫЙ URL СЕРВЕРА БЕЗ /api
    return `${serverURL}/${cleanAvatarPath}`;
  }

  // Если ничего не подошло, возвращаем null, чтобы компонент мог показать заглушку
  return null;
}; 