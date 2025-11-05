import crypto from 'crypto';
import BlockedIP from '../models/BlockedIP.js';

/**
 * Проверяет, является ли IP доверенным для пользователя
 * @param {Object} user - Объект пользователя
 * @param {String} ip - IP адрес для проверки
 * @returns {Boolean}
 */
export const isIPTrusted = (user, ip) => {
  // Проверяем основной IP (при регистрации)
  if (user.registrationDetails?.ip === ip) {
    return true;
  }
  
  // Проверяем дополнительные доверенные IP
  if (user.trustedIPs && user.trustedIPs.length > 0) {
    return user.trustedIPs.some(trusted => trusted.ip === ip);
  }
  
  return false;
};

/**
 * Добавляет новый доверенный IP
 * Если IP уже есть - обновляет lastUsed
 * Если достигнут лимит (3 дополнительных) - удаляет самый старый
 * @param {Object} user - Объект пользователя
 * @param {String} ip - IP адрес
 * @param {String} userAgent - User-Agent браузера
 * @param {String} location - Локация (город, страна)
 */
export const addTrustedIP = async (user, ip, userAgent = '', location = '') => {
  // Если это основной IP при регистрации - не добавляем в trustedIPs
  if (user.registrationDetails?.ip === ip) {
    return;
  }
  
  if (!user.trustedIPs) {
    user.trustedIPs = [];
  }
  
  // Проверяем, есть ли уже этот IP
  const existingIP = user.trustedIPs.find(trusted => trusted.ip === ip);
  
  if (existingIP) {
    // Обновляем lastUsed
    existingIP.lastUsed = new Date();
    existingIP.userAgent = userAgent;
    existingIP.location = location;
  } else {
    // Если достигнут лимит (3 дополнительных IP) - удаляем самый старый
    if (user.trustedIPs.length >= 3) {
      // Сортируем по lastUsed и удаляем самый старый
      user.trustedIPs.sort((a, b) => a.lastUsed - b.lastUsed);
      user.trustedIPs.shift(); // Удаляем первый (самый старый)
    }
    
    // Добавляем новый IP
    user.trustedIPs.push({
      ip,
      addedAt: new Date(),
      lastUsed: new Date(),
      userAgent,
      location
    });
  }
  
  await user.save();
};

/**
 * Генерирует код подтверждения для нового IP
 * @returns {String} 6-значный код
 */
export const generateVerificationCode = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Сохраняет код подтверждения в памяти (можно использовать Redis)
 * Формат: Map<userId_ip, { code, expiresAt, attempts, resendCount, lastResendAt }>
 */
export const verificationCodes = new Map();

/**
 * Временное хранилище заблокированных IP (для кэша)
 * Формат: Map<ip, { userId, blockedUntil, reason }>
 */
const blockedIPsCache = new Map();

/**
 * Очищает кэш заблокированных IP (для разработки)
 */
export const clearBlockedIPsCache = () => {
  blockedIPsCache.clear();
  console.log('✅ Кэш заблокированных IP очищен');
};

/**
 * Сохраняет код подтверждения
 * @param {String} userId - ID пользователя
 * @param {String} ip - IP адрес
 * @param {String} code - Код подтверждения
 */
export const saveVerificationCode = (userId, ip, code) => {
  const key = `${userId}_${ip}`;
  const existing = verificationCodes.get(key);
  
  verificationCodes.set(key, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 минут
    attempts: 0,
    resendCount: existing ? existing.resendCount : 0,
    lastResendAt: existing ? existing.lastResendAt : null
  });
};

/**
 * Проверяет, можно ли повторно отправить код
 * @param {String} userId - ID пользователя
 * @param {String} ip - IP адрес
 * @returns {Object} { canResend: Boolean, waitTime: Number, remainingResends: Number }
 */
export const canResendCode = (userId, ip) => {
  const key = `${userId}_${ip}`;
  const stored = verificationCodes.get(key);
  
  if (!stored) {
    return { canResend: true, waitTime: 0, remainingResends: 3 };
  }
  
  const resendCount = stored.resendCount || 0;
  const remainingResends = 3 - resendCount;
  
  // Максимум 3 повторные отправки
  if (resendCount >= 3) {
    return { canResend: false, waitTime: 0, remainingResends: 0, message: 'Превышен лимит повторных отправок' };
  }
  
  // Проверяем время с последней отправки
  if (stored.lastResendAt) {
    const timeSinceLastResend = Date.now() - stored.lastResendAt;
    
    // После 1-й отправки - ждать 1 минуту
    if (resendCount === 1 && timeSinceLastResend < 60 * 1000) {
      const waitTime = Math.ceil((60 * 1000 - timeSinceLastResend) / 1000);
      return { canResend: false, waitTime, remainingResends, message: `Подождите ${waitTime} секунд` };
    }
    
    // После 2-й отправки - ждать 5 минут
    if (resendCount === 2 && timeSinceLastResend < 5 * 60 * 1000) {
      const waitTime = Math.ceil((5 * 60 * 1000 - timeSinceLastResend) / 1000);
      return { canResend: false, waitTime, remainingResends, message: `Подождите ${Math.ceil(waitTime / 60)} минут` };
    }
  }
  
  return { canResend: true, waitTime: 0, remainingResends };
};

/**
 * Увеличивает счетчик повторных отправок
 * @param {String} userId - ID пользователя
 * @param {String} ip - IP адрес
 */
export const incrementResendCount = (userId, ip) => {
  const key = `${userId}_${ip}`;
  const stored = verificationCodes.get(key);
  
  if (stored) {
    stored.resendCount = (stored.resendCount || 0) + 1;
    stored.lastResendAt = Date.now();
  }
};

/**
 * Проверяет код подтверждения
 * @param {String} userId - ID пользователя
 * @param {String} ip - IP адрес
 * @param {String} code - Код для проверки
 * @returns {Promise<Object>} { success: Boolean, remainingAttempts: Number, blocked: Boolean }
 */
export const verifyCode = async (userId, ip, code) => {
  const key = `${userId}_${ip}`;
  const stored = verificationCodes.get(key);
  
  if (!stored) {
    return { success: false, remainingAttempts: 0, blocked: false };
  }
  
  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(key);
    return { success: false, remainingAttempts: 0, blocked: false };
  }
  
  if (stored.code === code) {
    verificationCodes.delete(key);
    return { success: true, remainingAttempts: 3, blocked: false };
  }
  
  // Неверный код - увеличиваем счетчик попыток
  stored.attempts += 1;
  const remainingAttempts = 3 - stored.attempts;
  
  if (stored.attempts >= 3) {
    // Блокируем IP на 24 часа ТОЛЬКО в MongoDB
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    try {
      await BlockedIP.create({
        ip,
        userId,
        reason: 'Превышено количество попыток подтверждения IP',
        expiresAt
      });
      console.log(`🚫 IP ${ip} заблокирован на 24 часа`);
    } catch (err) {
      console.error('❌ Ошибка блокировки IP в MongoDB:', err);
    }
    
    verificationCodes.delete(key);
    return { success: false, remainingAttempts: 0, blocked: true };
  }
  
  return { success: false, remainingAttempts, blocked: false };
};

/**
 * Проверяет, заблокирован ли IP (ТОЛЬКО MongoDB, БЕЗ кэша)
 * @param {String} ip - IP адрес
 * @returns {Promise<Boolean>}
 */
export const isIPBlocked = async (ip) => {
  try {
    const blocked = await BlockedIP.findOne({ 
      ip, 
      expiresAt: { $gt: new Date() } 
    });
    
    return !!blocked;
  } catch (error) {
    console.error('Ошибка проверки блокировки IP:', error);
    return false;
  }
};

