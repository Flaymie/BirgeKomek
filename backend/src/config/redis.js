import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

let redis;
let redisConnected = false;

try {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL не определена в .env файле. Redis не будет использоваться.');
  }

  // Позволяем явно отключать Redis без ошибок через значения: 'skip' или 'disabled'
  if (['skip', 'disabled'].includes(redisUrl.trim().toLowerCase())) {
    throw new Error('Redis отключен (REDIS_URL=skip|disabled). Будет использоваться заглушка.');
  }

  // Поддержка TLS: если используется схема rediss:// или порт 6380, включаем TLS
  const useTls = redisUrl.startsWith('rediss://') || /:(6380)(\b|\/)/.test(redisUrl);
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true,
    tls: useTls ? {} : undefined,
  });

  redis.on('connect', () => {
    redisConnected = true;
  });

  redis.on('error', (err) => {
    console.error('Не удалось подключиться к Redis:', err.message);
  });

  redis.connect().catch(err => {
    console.error('Первоначальное подключение к Redis не удалось:', err.message);
  });

} catch (error) {
  console.warn(`[ПРЕДУПРЕЖДЕНИЕ Redis] ${error.message}`);
  // Создаем пустышку, если Redis не настроен, чтобы приложение не падало.
  redis = {
    get: async () => null,
    set: async () => 'OK',
    del: async () => 1,
    exists: async () => 0,
    sadd: async () => 0,
    srem: async () => 0,
    smembers: async () => [],
    hgetall: async () => ({}),
    hset: async () => 1,
    connect: () => Promise.resolve(),
    on: () => {},
  };
  redisConnected = false;
}

export const isRedisConnected = () => redisConnected;
export default redis; 