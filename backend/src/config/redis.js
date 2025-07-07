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
    maxRetriesPerRequest: 3, // Меньше попыток переподключения
    connectTimeout: 5000,    // 5 секунд на подключение
    lazyConnect: true        // Подключаться только при первой команде
  });

  redis.on('connect', () => {
    // console.log('Redis подключен успешно.');
    redisConnected = true;
  });

  redis.on('error', (err) => {
    console.error('Не удалось подключиться к Redis:', err.message);
    // Важно не выставлять redisConnected в false здесь, 
    // чтобы избежать "моргания" состояния при временных сбоях.
    // ioredis сам попробует переподключиться.
  });

  // Первоначальное подключение
  redis.connect().catch(err => {
    console.error('Первоначальное подключение к Redis не удалось:', err.message);
  });

} catch (error) {
  console.warn(`[ПРЕДУПРЕЖДЕНИЕ] ${error.message}`);
  // Создаем "пустышку", если Redis не настроен, чтобы приложение не падало.
  // Методы будут просто возвращать значения по умолчанию.
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
    // Добавляем заглушку для connect, чтобы избежать ошибок при вызове
    connect: () => Promise.resolve(),
    on: () => {}, // Пустая функция для on
  };
  redisConnected = false;
}

export const isRedisConnected = () => redisConnected;
export default redis; 