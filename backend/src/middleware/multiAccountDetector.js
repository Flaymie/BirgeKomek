import redis from '../config/redis.js';
import User from '../models/User.js';

const BAN_REASON = 'Автоматическая блокировка: подозрение на мультиаккаунт.';
const IP_USER_SET_PREFIX = 'ip-users:';
const IP_BAN_FLAG_PREFIX = 'ip-banned:';
const WINDOW_SECONDS = 900;

const multiAccountDetector = async (req, res, next) => {
  // миддлваре работает только для аутентифицированных пользователей
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

    // если IP уже помечен как "плохой", просто баним нового юзера и выходим
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
    
    await redis.sadd(ipUserSet, userId);
    await redis.expire(ipUserSet, WINDOW_SECONDS);

    const usersInSet = await redis.smembers(ipUserSet);

    // если в наборе больше одного пользователя, значит, сработал триггер
    if (usersInSet.length > 1) {
      const banReason = `Обнаружена подозрительная активность (мультиаккаунт). IP: ${ip}. Связанные аккаунты: ${usersInSet.join(', ')}`;
      
      console.log(`[MultiAccount] Обнаружена подозрительная активность с IP: ${ip}. Пользователи: ${usersInSet.join(', ')}`);

      for (const uid of usersInSet) {
        const userToBan = await User.findById(uid);
        if (userToBan && !userToBan.banDetails.isBanned) {
          userToBan.banDetails.isBanned = true;
          userToBan.banDetails.reason = BAN_REASON;
          userToBan.banDetails.bannedAt = new Date();
          await userToBan.save();
          console.log(`[MultiAccount] Пользователь ${uid} перманентно забанен.`);
        }
      }
      
      await redis.set(ipBanFlag, '1', 'EX', 86400); 

      return res.status(403).json({ msg: BAN_REASON });
    }

  } catch (error) {
    console.error('[MultiAccountDetector] Ошибка в работе детектора мультиаккаунтов:', error);
  }

  return next();
};

export default multiAccountDetector; 