import 'dotenv/config';

const INTERNAL_BOT_KEY = process.env.INTERNAL_BOT_KEY;

if (!INTERNAL_BOT_KEY) {
  console.warn('ВНИМАНИЕ: INTERNAL_BOT_KEY не установлен. Внутренние API-эндпоинты не защищены.');
}

export const internalBotAuth = (req, res, next) => {
  const providedKey = req.headers['x-internal-bot-key'];

  if (!INTERNAL_BOT_KEY || providedKey !== INTERNAL_BOT_KEY) {
    return res.status(403).json({ msg: 'Доступ запрещен: неверный внутренний ключ.' });
  }

  next();
}; 