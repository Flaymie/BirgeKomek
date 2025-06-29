import rateLimit from 'express-rate-limit';

// --- Общие настройки ---
const commonOptions = {
  standardHeaders: true, // Возвращать информацию о лимитах в заголовках `RateLimit-*`
  legacyHeaders: false, // Отключить заголовки `X-RateLimit-*`
  keyGenerator: (req, res) => {
    // Используем ID пользователя если он есть, иначе IP. Это ключ для подсчета запросов.
    return req.user ? req.user.id : req.ip;
  },
};

// --- Лимитеры для конкретных действий ---

// 1. Лимитер для попыток входа (защита от брутфорса)
export const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 10 * 60 * 1000, // 10 минут
  max: 5,
  message: { msg: 'Слишком много попыток входа. Пожалуйста, попробуйте снова через 10 минут.' },
  keyGenerator: (req, res) => req.ip, // Для логина всегда считаем по IP
});

// 2. Лимитер на создание новых заявок
export const createRequestLimiter = rateLimit({
  ...commonOptions,
  windowMs: 24 * 60 * 60 * 1000, // 24 часа
  max: 5,
  message: { msg: 'Вы достигли лимита на создание заявок (5 в день).' },
});

// 3. Лимитер на отправку сообщений в чате (защита от спама)
export const sendMessageLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 20,
  message: { msg: 'Вы отправляете сообщения слишком часто. Немного подождите.' },
});

// 4. Лимитер на загрузку файлов
export const uploadLimiter = rateLimit({
  ...commonOptions,
  windowMs: 24 * 60 * 60 * 1000, // 24 часа
  max: 20,
  message: { msg: 'Вы достигли дневного лимита на загрузку файлов (20).' },
});


// --- ОСНОВНОЙ ГИБКИЙ ЛИМИТЕР НА ОСНОВЕ РОЛИ ---

// Эта функция будет динамически определять 'max' для основного лимитера
const getMaxRequestsByRole = (req) => {
  // Для системных запросов/бота можно будет добавить отдельную проверку, например, по API ключу в будущем
  if (req.user) {
    const { role, telegramId } = req.user;
    if (role === 'admin' || role === 'moderator') {
      return 5000; // Админам и модерам даем много
    }
    if (role === 'helper') {
      return 2000; // Хелперы - активные юзеры
    }
    if (role === 'user') {
      return telegramId ? 1000 : 500; // Обычный юзер с TG и без
    }
  }
  // Для гостей (неавторизованных) или юзеров без роли
  return 200;
};

// Сам основной лимитер
export const generalLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000, // 15 минутное окно для предотвращения кратковременных всплесков
  max: (req, res) => getMaxRequestsByRole(req),
  message: { msg: 'Вы делаете слишком много запросов. Пожалуйста, подождите.' },
}); 