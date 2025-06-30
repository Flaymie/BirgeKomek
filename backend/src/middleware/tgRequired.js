import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const tgRequired = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ msg: 'Требуется авторизация.' });
    }

    if (!req.user.telegramId) {
        return res.status(403).json({ msg: "Для выполнения этого действия необходимо привязать Telegram." });
    }
    
    next();
};

export default tgRequired;