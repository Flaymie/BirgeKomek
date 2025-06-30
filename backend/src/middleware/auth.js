import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  // 1. Извлекаем токен из заголовка или query-параметра
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query.token) { // Для SSE
    token = req.query.token;
  }

  // 2. Если токена нет нигде - отказ
  if (!token) {
    return res.status(401).json({ msg: 'Не авторизован, нет токена' });
  }

  // 3. Если токен есть - проверяем его
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');

    // 4. Если юзер с таким токеном не найден - отказ
    if (!user) {
      return res.status(401).json({ msg: 'Пользователь не найден, отказ в доступе' });
    }

    // 5. Проверяем бан
    if (user.banDetails?.isBanned) {
      const now = new Date();
      if (user.banDetails.expiresAt && user.banDetails.expiresAt < now) {
        // Бан истек, снимаем его и пропускаем дальше
        user.banDetails.isBanned = false;
        user.banDetails.reason = null;
        user.banDetails.bannedAt = null;
        user.banDetails.expiresAt = null;
        await user.save();
      } else {
        // Бан активен, возвращаем 403 с деталями
        return res.status(403).json({
          msg: 'Доступ запрещен: аккаунт заблокирован.',
          banDetails: user.banDetails,
          user: user
        });
      }
    }
    
    // 6. Все в порядке - добавляем юзера в запрос и пропускаем
    req.user = user;
    next();

  } catch (error) {
    // 7. Если токен недействителен (ошибка верификации) - отказ
    console.error('Ошибка авторизации:', error.message);
    return res.status(401).json({ msg: 'Не авторизован, токен недействителен' });
  }
};

// --- НОВАЯ ФУНКЦИЯ ДЛЯ ЗАЩИТЫ SOCKET.IO ---
export const protectSocket = async (socket, next) => {
  let token;
  if (socket.handshake.auth && socket.handshake.auth.token) {
    token = socket.handshake.auth.token;
  }

  if (!token) {
    return next(new Error('Нет токена, авторизуйтесь'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Не найден юзер с этим токеном'));
    }

    if (user.banDetails.isBanned) {
      // Можно добавить логику разбана, как в protect, но для простоты пока просто отклоняем
      return next(new Error('Аккаунт забанен'));
    }

    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket Auth Error:', err.message);
    return next(new Error('Невалидный токен'));
  }
};

// проверка на хелпера
export const isHelper = (req, res, next) => {
  if (!req.user || !req.user.roles.helper) {
    return res.status(403).json({ msg: 'Нужны права хелпера' });
  }
  next();
};

// Проверка на администратора
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.admin) {
    next();
  } else {
    res.status(403).json({ msg: 'Доступ запрещен. Требуются права администратора.' });
  }
};

// Проверка на модератора
export const isModerator = (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.moderator) {
    next();
  } else {
    res.status(403).json({ msg: 'Доступ запрещен. Требуются права модератора.' });
  }
};

// Проверка на модератора или администратора
export const isModOrAdmin = (req, res, next) => {
  if (req.user && req.user.roles && (req.user.roles.moderator || req.user.roles.admin)) {
    next();
  } else {
    res.status(403).json({ msg: 'Доступ запрещен. Требуются права модератора или администратора.' });
  }
}; 