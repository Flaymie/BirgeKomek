import { isIPBlocked } from '../utils/sessionManager.js';

/**
 * Middleware для проверки заблокированного IP
 * Блокирует любые запросы с заблокированного IP
 */
const checkBlockedIP = async (req, res, next) => {
  try {
    const currentIP = req.headers['x-test-ip'] || req.ip;
    
    const blocked = await isIPBlocked(currentIP);
    if (blocked) {
      return res.status(403).json({
        code: 'IP_BLOCKED',
        msg: 'Ваш IP адрес заблокирован на 24 часа из-за подозрительной активности. Если это ошибка, свяжитесь с поддержкой.'
      });
    }
    
    next();
  } catch (error) {
    console.error('Ошибка в checkBlockedIP middleware:', error);
    next();
  }
};

export default checkBlockedIP;
