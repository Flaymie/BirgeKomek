import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { isIPBlocked, isIPTrusted } from '../utils/sessionManager.js';

export const protect = async (req, res, next) => {
  let token;
  
  // проверяем хедер на наличие токена
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ msg: 'Нет токена, авторизуйтесь' });
  }
  
  try {
    // проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    

    const userId = decoded.user ? decoded.user.id : decoded.id;

    if (!userId) {
      return res.status(401).json({ msg: 'Невалидный токен (нет ID пользователя)' });
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ msg: 'Не найден юзер с этим токеном' });
    }
    
    // ПРОВЕРКА НА БАН АККАУНТА
    if (user.banDetails.isBanned) {
      const now = new Date();
      if (user.banDetails.expiresAt && user.banDetails.expiresAt <= now) {
        user.banDetails.isBanned = false;
        user.banDetails.reason = null;
        user.banDetails.bannedAt = null;
        user.banDetails.expiresAt = null;
        await user.save();
      } else {
        const banReason = user.banDetails.reason || 'Причина не указана';
        let message = `Ваш аккаунт заблокирован. Причина: ${banReason}`;
        if (user.banDetails.expiresAt) {
          message += ` Бан до: ${user.banDetails.expiresAt.toLocaleString('ru-RU')}`;
        } else {
          message += ' Бан перманентный.';
        }
        
        return res.status(403).json({ 
          msg: message,
          isBanned: true,
          banDetails: user.banDetails
        });
      }
    }

    // ПРОВЕРКА НА БАН ПО IP (глобально для всех защищенных роутов)
    const currentIP = req.headers['x-test-ip'] || req.ip;
    if (await isIPBlocked(currentIP)) {
      return res.status(403).json({
        code: 'IP_BLOCKED',
        msg: 'Ваш IP адрес заблокирован на 24 часа из-за подозрительной активности. Если это ошибка, свяжитесь с поддержкой.'
      });
    }

    // Разрешаем работать без проверки доверенного IP только на спец-роутах подтверждения IP
    const allowlistPaths = ['/api/auth/verify-ip', '/api/auth/confirm-ip'];
    const path = req.originalUrl || req.path || '';
    const isAllowlisted = allowlistPaths.some(p => path.startsWith(p));

    // Если IP не доверенный — требуем подтверждение и запрещаем доступ ко всем защищенным ручкам
    if (!isAllowlisted && !isIPTrusted(user, currentIP)) {
      return res.status(403).json({
        code: 'IP_VERIFICATION_REQUIRED',
        msg: 'Обнаружен вход с нового IP адреса. Требуется подтверждение через Telegram.',
        currentIP
      });
    }
    
    // добавляем юзера в запрос
    req.user = user;
    next();
  } catch (err) {
    console.error('Ошибка авторизации:', err);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        msg: 'Токен истек. Пожалуйста, войдите снова.',
        tokenExpired: true 
      });
    }
    
    res.status(401).json({ msg: 'Невалидный токен' });
  }
};

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


    const userId = decoded.user ? decoded.user.id : decoded.id;


    if (!userId) {
       return next(new Error('Невалидный токен (нет ID пользователя)'));
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return next(new Error('Не найден юзер с этим токеном'));
    }

    if (user.banDetails.isBanned) {
      return next(new Error('Аккаунт забанен'));
    }

    socket.user = user;
    next();
  } catch (err) {
    console.error('Socket Auth Error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return next(new Error('TOKEN_EXPIRED'));
    }
    
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

// Проверка на админа
export const isAdmin = (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.admin) {
    next();
  } else {
    res.status(403).json({ msg: 'Доступ запрещен. Требуются права администратора.' });
  }
};

// Проверка на модера
export const isModerator = (req, res, next) => {
  if (req.user && req.user.roles && req.user.roles.moderator) {
    next();
  } else {
    res.status(403).json({ msg: 'Доступ запрещен. Требуются права модератора.' });
  }
};

// Проверка на модера или админа
export const isModOrAdmin = (req, res, next) => {
  if (req.user && req.user.roles && (req.user.roles.moderator || req.user.roles.admin)) {
    next();
  } else {
    res.status(403).json({ msg: 'Доступ запрещен. Требуются права модератора или администратора.' });
  }
}; 