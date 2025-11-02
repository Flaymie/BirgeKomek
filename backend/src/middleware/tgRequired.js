import User from '../models/User.js';

const tgRequired = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ msg: 'Требуется авторизация.' });
    }

    try {
        // Загружаем полные данные пользователя из БД
        const user = await User.findById(req.user.id);
        
        if (!user) {
            return res.status(404).json({ msg: 'Пользователь не найден.' });
        }

        if (!user.telegramId) {
            return res.status(403).json({ msg: "Для выполнения этого действия необходимо привязать Telegram." });
        }
        
        next();
    } catch (error) {
        console.error('Ошибка в tgRequired middleware:', error);
        return res.status(500).json({ msg: 'Ошибка сервера.' });
    }
};

export default tgRequired;