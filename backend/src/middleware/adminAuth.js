import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const adminAuth = async (req, res, next) => {
  // Сначала используем стандартный middleware для проверки токена (предполагается, что он уже отработал)
  // Но здесь мы продублируем логику на случай прямого обращения
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Получаем токен из заголовка
      token = req.headers.authorization.split(' ')[1];

      // Верифицируем токен
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Находим пользователя по ID из токена и проверяем роль
      // Исключаем пароль из выборки
      const user = await User.findById(decoded.user.id).select('-password');
      
      if (user && user.roles && user.roles.admin) {
        req.user = user; // Добавляем пользователя в запрос
        next(); // Все ок, пользователь - админ
      } else {
        res.status(403).json({ message: 'Доступ запрещен. Недостаточно прав.' });
      }
    } catch (error) {
      console.error('Ошибка аутентификации администратора:', error);
      res.status(401).json({ message: 'Не авторизован, токен недействителен' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Не авторизован, нет токена' });
  }
};

export default adminAuth;