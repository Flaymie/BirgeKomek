import redis from '../config/redis.js';
import User from '../models/User.js';

const BAN_REASON = 'Автоматическая блокировка: подозрение на мультиаккаунт.';
const IP_USER_SET_PREFIX = 'ip-users:';
const IP_BAN_FLAG_PREFIX = 'ip-banned:';
const WINDOW_SECONDS = 900; // 15 минут

const multiAccountDetector = async (req, res, next) => {
  // Middleware работает только для аутентифицированных пользователей
  if (!req.user || !req.ip) {
    return next();
  }
  
  const { id: userId, roles } = req.user;
  const ip = req.ip;

  // Админов и модераторов не трогаем, им можно все
  if (roles.admin || roles.moderator) {
    return next();
  }

  try {
    const ipBanFlag = `${IP_BAN_FLAG_PREFIX}${ip}`;
    const isIpBanned = await redis.get(ipBanFlag);

    // Если IP уже помечен как "плохой", просто баним нового юзера и выходим
    // Это оптимизация, чтобы не делать лишних запросов
    if (isIpBanned) {
      const userToBan = await User.findById(userId);
      if (userToBan && !userToBan.banDetails.isBanned) {
        userToBan.banDetails.isBanned = true;
        userToBan.banDetails.reason = BAN_REASON;
        userToBan.banDetails.bannedAt = new Date();
        await userToBan.save();
        console.log(`[MultiAccount] Пользователь ${userId} забанен по уже помеченному IP ${ip}`);
      }
      return res.status(403).json({ msg: BAN_REASON });
    }

    const ipUserSet = `${IP_USER_SET_PREFIX}${ip}`;
    
    // Добавляем текущего пользователя в "набор" для этого IP
    await redis.sadd(ipUserSet, userId);
    // Устанавливаем/обновляем время жизни "набора"
    await redis.expire(ipUserSet, WINDOW_SECONDS);

    // Получаем всех пользователей из набора
    const usersInSet = await redis.smembers(ipUserSet);

    // Если в наборе больше одного пользователя, значит, сработал триггер
    if (usersInSet.length > 1) {
      console.log(`[MultiAccount] Обнаружена подозрительная активность с IP: ${ip}. Пользователи: ${usersInSet.join(', ')}`);

      // Баним всех пользователей из этого набора
      for (const uid of usersInSet) {
        const userToBan = await User.findById(uid);
        // Проверяем, что пользователь существует и еще не забанен
        if (userToBan && !userToBan.banDetails.isBanned) {
          userToBan.banDetails.isBanned = true;
          userToBan.banDetails.reason = BAN_REASON;
          userToBan.banDetails.bannedAt = new Date();
          // Можно добавить, кто забанил (системный бан)
          // userToBan.banDetails.bannedBy = ...; 
          await userToBan.save();
          console.log(`[MultiAccount] Пользователь ${uid} перманентно забанен.`);
        }
      }
      
      // Помечаем IP как забаненный на 24 часа, чтобы сразу банить новых "гостей"
      await redis.set(ipBanFlag, '1', 'EX', 86400); 

      // Отправляем ответ, что доступ запрещен
      return res.status(403).json({ msg: BAN_REASON });
    }

  } catch (error) {
    console.error('[MultiAccountDetector] Ошибка в работе детектора мультиаккаунтов:', error);
  }

  return next();
};

export default multiAccountDetector; 