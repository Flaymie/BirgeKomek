import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  
  // проверяем хедер на наличие токена
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ msg: 'Пользователь не найден, отказ в доступе' });
      }
      
      // --- НОВАЯ ПРОВЕРКА НА БАН ---
      if (req.user.banDetails && req.user.banDetails.isBanned) {
        // Проверяем, не истек ли срок бана
        const now = new Date();
        if (req.user.banDetails.expiresAt && req.user.banDetails.expiresAt < now) {
          // Бан истек, снимаем его
          req.user.banDetails.isBanned = false;
          req.user.banDetails.reason = null;
          req.user.banDetails.bannedAt = null;
          req.user.banDetails.expiresAt = null;
          await req.user.save();
        } else {
          // Бан активен, возвращаем 403 с деталями
          return res.status(403).json({ 
            msg: 'Доступ запрещен: аккаунт заблокирован.',
            banDetails: req.user.banDetails,
            user: req.user // Отправляем данные юзера, чтобы фронт мог их показать
          });
        }
      }

      next();
    } catch (error) {
      console.error('Ошибка авторизации:', error.message);
      return res.status(401).json({ msg: 'Не авторизован, токен недействителен' });
    }
  }

  // Добавляем проверку токена в query параметрах для SSE
  else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ msg: 'Не авторизован, нет токена' });
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