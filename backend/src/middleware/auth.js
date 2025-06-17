import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;
  
  // проверяем хедер на наличие токена
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  if (!token) {
    return res.status(401).json({ msg: 'Нет токена, авторизуйтесь' });
  }
  
  try {
    // проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // ищем юзера и не возвращаем пароль
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ msg: 'Не найден юзер с этим токеном' });
    }
    
    // добавляем юзера в запрос
    req.user = user;
    next();
  } catch (err) {
    console.error('Ошибка авторизации:', err);
    res.status(401).json({ msg: 'Невалидный токен' });
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