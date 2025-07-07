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

  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true
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
  console.warn(`[ПРЕДУПРЕЖДЕНИЕ] ${error.message}`);
  // Создаем "пустышку", если Redis не настроен, чтобы приложение не падало.
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