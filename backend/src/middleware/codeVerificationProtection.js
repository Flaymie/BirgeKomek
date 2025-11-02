import redis from '../config/redis.js';
import User from '../models/User.js';
import { sendTelegramMessage } from '../routes/users.js';

/**
 * Middleware для защиты от брутфорса кодов подтверждения
 * Отслеживает неудачные попытки ввода кода для конкретного действия
 * После 3 неудачных попыток автоматически банит пользователя на 7 дней
 */

const MAX_ATTEMPTS = 3;
const BAN_DURATION_DAYS = 7;

/**
 * Создает ключ Redis для отслеживания попыток
 * @param {string} userId - ID пользователя
 * @param {string} actionType - Тип действия (ban, delete, etc.)
 * @param {string} targetId - ID цели действия (опционально)
 */
const getAttemptsKey = (userId, actionType, targetId = '') => {
  return `code-attempts:${userId}:${actionType}${targetId ? `:${targetId}` : ''}`;
};

/**
 * Проверяет количество неудачных попыток
 * @param {string} userId - ID пользователя
 * @param {string} actionType - Тип действия
 * @param {string} targetId - ID цели действия
 * @returns {Promise<number>} - Количество попыток
 */
export const getAttempts = async (userId, actionType, targetId = '') => {
  const key = getAttemptsKey(userId, actionType, targetId);
  const attempts = await redis.get(key);
  return attempts ? parseInt(attempts) : 0;
};

/**
 * Увеличивает счетчик неудачных попыток
 * @param {string} userId - ID пользователя
 * @param {string} actionType - Тип действия
 * @param {string} targetId - ID цели действия
 * @returns {Promise<number>} - Новое количество попыток
 */
export const incrementAttempts = async (userId, actionType, targetId = '') => {
  const key = getAttemptsKey(userId, actionType, targetId);
  const attempts = await redis.incr(key);
  
  // Устанавливаем TTL 10 минут, если это первая попытка
  if (attempts === 1) {
    await redis.expire(key, 600); // 10 минут
  }
  
  return attempts;
};

/**
 * Сбрасывает счетчик попыток (после успешной проверки)
 * @param {string} userId - ID пользователя
 * @param {string} actionType - Тип действия
 * @param {string} targetId - ID цели действия
 */
export const resetAttempts = async (userId, actionType, targetId = '') => {
  const key = getAttemptsKey(userId, actionType, targetId);
  await redis.del(key);
};

/**
 * Банит пользователя за подозрение во взломе
 * @param {string} userId - ID пользователя
 * @param {string} actionType - Тип действия, которое пытались выполнить
 */
const banUserForSuspiciousActivity = async (userId, actionType) => {
  const user = await User.findById(userId);
  
  if (!user) {
    console.error(`[CodeProtection] Пользователь ${userId} не найден`);
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + BAN_DURATION_DAYS);

  user.banDetails = {
    isBanned: true,
    reason: `Подозрение во взломе аккаунта.`,
    bannedBy: null, // Системный бан
    bannedAt: new Date(),
    expiresAt: expiresAt
  };

  await user.save();

  // Отправляем уведомление в Telegram
  if (user.telegramId) {
    const actionNames = {
      'ban': 'бан пользователя',
      'delete': 'удаление аккаунта',
      'unban': 'разбан пользователя',
      'delete-request': 'удаление заявки'
    };

    const actionName = actionNames[actionType] || actionType;
    const unbanDate = expiresAt.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const message = `🚨 ВНИМАНИЕ! Подозрение во взломе\n\n` +
      `Ваш аккаунт был временно заблокирован из-за подозрительной активности.\n\n` +
      `📋 Причина: Обнаружено ${MAX_ATTEMPTS} неудачных попытки ввода кода подтверждения для действия "${actionName}".\n\n` +
      `⏰ Срок блокировки: до ${unbanDate}\n\n` +
      `❓ Что делать?\n` +
      `Если это были не вы, ваш аккаунт мог быть взломан. Немедленно:\n` +
      `1. Смените пароль (если возможно)\n` +
      `2. Свяжитесь с поддержкой\n` +
      `3. Предоставьте доказательства владения аккаунтом\n\n` +
      `Если это были вы, свяжитесь с поддержкой для разблокировки.`;

    try {
      await sendTelegramMessage(user.telegramId, message);
    } catch (error) {
      console.error(`[CodeProtection] Ошибка отправки уведомления в Telegram для ${user.username}:`, error);
    }
  }

  console.log(`[CodeProtection] Пользователь ${user.username} (${userId}) забанен за подозрение во взломе. Действие: ${actionType}`);
};

/**
 * Middleware для проверки кода подтверждения с защитой от брутфорса
 * Использовать ПОСЛЕ проверки кода, если код неверный
 */
export const handleFailedCodeAttempt = async (req, res, next) => {
  const userId = req.user.id;
  const { actionType, targetId } = req.codeProtection || {};

  if (!actionType) {
    console.error('[CodeProtection] actionType не указан в req.codeProtection');
    return next();
  }

  const attempts = await incrementAttempts(userId, actionType, targetId);

  console.log(`[CodeProtection] Неудачная попытка ${attempts}/${MAX_ATTEMPTS} для пользователя ${req.user.username}. Действие: ${actionType}`);

  if (attempts >= MAX_ATTEMPTS) {
    console.log(`[CodeProtection] Достигнут лимит попыток. Баним пользователя ${req.user.username}`);
    
    // Сбрасываем счетчик ПЕРЕД баном, чтобы избежать повторных банов
    await resetAttempts(userId, actionType, targetId);
    
    await banUserForSuspiciousActivity(userId, actionType);
    
    return res.status(403).json({
      msg: `Превышено количество попыток ввода кода. Ваш аккаунт заблокирован на ${BAN_DURATION_DAYS} дней из-за подозрения во взломе. Свяжитесь с поддержкой.`,
      banned: true
    });
  }

  // Возвращаем информацию о количестве оставшихся попыток
  const remainingAttempts = MAX_ATTEMPTS - attempts;
  return res.status(400).json({
    msg: `Неверный код подтверждения. Осталось попыток: ${remainingAttempts}`,
    remainingAttempts
  });
};

/**
 * Устанавливает контекст для защиты кода
 * Вызывать в начале роута, где требуется проверка кода
 */
export const setCodeProtectionContext = (actionType, targetId = '') => {
  return (req, res, next) => {
    req.codeProtection = { actionType, targetId };
    next();
  };
};

export default {
  getAttempts,
  incrementAttempts,
  resetAttempts,
  handleFailedCodeAttempt,
  setCodeProtectionContext
};
