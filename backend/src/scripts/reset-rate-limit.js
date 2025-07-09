
import redis from '../config/redis.js';

const keyToDelete = process.argv[2];

if (!keyToDelete) {
  console.error('Пожалуйста, укажите ключ для удаления (IP-адрес или ID пользователя).');
  console.error('Пример: node backend/src/scripts/reset-rate-limit.js 127.0.0.1');
  process.exit(1);
}

const main = async () => {
  try {
    const prefixes = [
      'rl:general-limiter:',
      'rl:login-limiter:',
      'rl:create-request-limiter:',
      'rl:send-message-limiter:',
      'rl:create-report-limiter:',
      'rl:registration-limiter:'
    ];

    let deletedCount = 0;

    // `rate-limit-redis` по умолчанию не добавляет префикс, но `express-rate-limit` может
    // Попробуем удалить и ключ как есть, и с возможными префиксами
    const directDeleteResult = await redis.del(keyToDelete);
    if (directDeleteResult > 0) {
        deletedCount += directDeleteResult;
        console.log(`Удален ключ без префикса: ${keyToDelete}`);
    }


    const keys = await redis.keys(`*${keyToDelete}*`);
    if (keys.length === 0) {
      console.log(`Не найдено ключей в Redis, содержащих "${keyToDelete}".`);
      if (deletedCount === 0) {
          console.log('Ничего не было удалено.');
      }
      return;
    }

    console.log(`Найдены следующие ключи для удаления: ${keys.join(', ')}`);

    const result = await redis.del(keys);
    deletedCount += result;

    if (deletedCount > 0) {
      console.log(`Успешно удалено ${deletedCount} ключей, связанных с "${keyToDelete}".`);
      console.log('Лимиты для данного ключа должны быть сброшены.');
    } else {
      console.log(`Не удалось найти или удалить ключи для "${keyToDelete}". Возможно, лимит уже истек.`);
    }
  } catch (error) {
    console.error('Произошла ошибка при сбросе лимитов:', error);
  } finally {
    redis.quit();
  }
};

main(); 