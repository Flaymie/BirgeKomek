import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis.js';

// --- Общие настройки ---
const commonOptions = {
  standardHeaders: true, // Возвращать информацию о лимитах в заголовках `RateLimit-*`
  legacyHeaders: false, // Отключить заголовки `X-RateLimit-*`
  keyGenerator: (req, res) => {
    // Приоритет - IP. Это защищает от абуза с одного IP под разными аккаунтами.
    // Если IP недоступен (что редкость), используем ID пользователя.
    return req.ip || (req.user ? req.user.id : null);
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
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req, res) => {
    return req.user ? req.user.id : req.ip;
  },
});

// 3. Лимитер на отправку сообщений в чате (защита от спама)
export const sendMessageLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 20,
  message: { msg: 'Вы отправляете сообщения слишком часто. Немного подождите.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req, res) => req.user.id,
});

// 4. Лимитер на загрузку файлов
export const uploadLimiter = rateLimit({
  ...commonOptions,
  windowMs: 24 * 60 * 60 * 1000, // 24 часа
  max: 20,
  message: { msg: 'Вы достигли дневного лимита на загрузку файлов (20).' },
});

// 5. Лимитер на регистрацию (защита от мультиаккаунтов)
export const registrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 часа
  max: 1, // 1 регистрация с одного IP в сутки
  message: { msg: 'С этого IP-адреса уже была произведена регистрация за последние 24 часа. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip, // Строго по IP
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
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
  keyGenerator: (req, res) => { // Явно указываем здесь для надежности
    return req.ip || (req.user ? req.user.id : null);
  },
  message: { msg: 'Вы делаете слишком много запросов. Пожалуйста, подождите.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
}); 