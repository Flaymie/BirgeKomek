import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redis from '../config/redis.js';

const commonOptions = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    return req.ip || (req.user ? req.user.id : null);
  },
};


export const loginLimiter = rateLimit({
  ...commonOptions,
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: { msg: 'Слишком много попыток входа. Пожалуйста, попробуйте снова через 10 минут.' },
  keyGenerator: (req, res) => req.ip,
});

export const createRequestLimiter = rateLimit({
  ...commonOptions,
  windowMs: 24 * 60 * 60 * 1000,
  max: 50,
  message: { msg: 'Вы достигли лимита на создание заявок (50 в день).' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req, res) => {
    return req.user ? req.user.id : req.ip;
  },
});

export const sendMessageLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 1000,
  max: 200,
  message: { msg: 'Вы отправляете сообщения слишком часто. Немного подождите.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req, res) => req.user.id,
});

export const createReportLimiter = rateLimit({
  ...commonOptions,
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { msg: 'Вы можете подать не более 50 жалоб в час. Попробуйте позже.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  keyGenerator: (req, res) => req.user.id,
});

export const uploadLimiter = rateLimit({
  ...commonOptions,
  windowMs: 24 * 60 * 60 * 1000,
  max: 200,
  message: { msg: 'Вы достигли дневного лимита на загрузку файлов (200).' },
});

export const registrationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 10,
  message: { msg: 'С этого IP-адреса уже была произведена регистрация за последние 24 часа. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => req.ip,
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
});



const getMaxRequestsByRole = (req) => {
  if (req.user) {
    const { role } = req.user;
    if (role === 'admin') {
      return 700000;
    }
    if (role === 'moderator') {
      return 300000;
    }
    if (role === 'helper') {
      return 20000;
    }
    if (role === 'user') {
      return req.user.telegramId ? 10000 : 5000;
    }
  }
  return 2000;
};

export const generalLimiter = rateLimit({
  ...commonOptions,
  windowMs: 15 * 60 * 1000,
  max: (req, res) => getMaxRequestsByRole(req),
  keyGenerator: (req, res) => {
    return req.ip || (req.user ? req.user.id : null);
  },
  message: { msg: 'Вы делаете слишком много запросов. Пожалуйста, подождите.' },
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
}); 