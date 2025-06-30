const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function(req, res, next) {
    // Этот middleware должен идти ПОСЛЕ `auth` middleware,
    // так как мы ожидаем, что `req.user` уже существует.
    if (!req.user) {
        // На случай, если auth middleware не отработал или был пропущен
        return res.status(401).json({ msg: 'Требуется авторизация.' });
    }

    try {
        // Мы могли бы просто проверять req.user.telegramId,
        // но лучше перестраховаться и сделать запрос к свежей копии юзера из БД.
        // Вдруг телеграм был отвязан в другой сессии.
        const user = await User.findById(req.user.id);

        if (!user || !user.telegramId) {
            return res.status(403).json({ msg: 'Для выполнения этого действия необходимо привязать Telegram.' });
        }
        
        // Все в порядке, у пользователя есть telegramId
        next();
    } catch (err) {
        console.error('Ошибка в middleware tgRequired:', err);
        res.status(500).send('Серверная ошибка');
    }
}; 
export default tgRequired;