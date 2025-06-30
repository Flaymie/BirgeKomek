import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const tgRequired = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ msg: 'Требуется авторизация.' });
    }

    try {
        const user = await User.findById(req.user.id);

        if (!user || !user.telegramId) {
            return res.status(403).json({ msg: 'Для выполнения этого действия необходимо привязать Telegram.' });
        }
        
        next();
    } catch (err) {
        console.error('Ошибка в middleware tgRequired:', err);
        res.status(500).send('Серверная ошибка');
    }
};

export default tgRequired;