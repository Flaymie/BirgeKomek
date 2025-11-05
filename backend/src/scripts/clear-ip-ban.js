import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import BlockedIP from '../models/BlockedIP.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

const clearIPBan = async (ip) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Подключено к MongoDB');

    if (ip) {
      // Удаляем конкретный IP
      const result = await BlockedIP.deleteOne({ ip });
      if (result.deletedCount > 0) {
        console.log(`✅ Бан для IP ${ip} успешно удален из MongoDB`);
      } else {
        console.log(`⚠️ IP ${ip} не найден в списке заблокированных в MongoDB`);
      }
    } else {
      // Удаляем все баны
      const result = await BlockedIP.deleteMany({});
      console.log(`✅ Удалено ${result.deletedCount} заблокированных IP из MongoDB`);
    }

    // Показываем оставшиеся баны
    const remaining = await BlockedIP.find({});
    console.log(`\n📋 Активных банов в MongoDB: ${remaining.length}`);
    if (remaining.length > 0) {
      console.log('\nСписок заблокированных IP:');
      remaining.forEach(ban => {
        console.log(`- ${ban.ip} (до ${ban.expiresAt.toLocaleString('ru-RU')})`);
      });
    }

    await mongoose.disconnect();
    console.log('\n✅ Отключено от MongoDB');
    console.log('\n⚠️ ВАЖНО: Перезапустите сервер, чтобы очистить кэш в памяти!');
    console.log('Или выполните: curl -X POST http://localhost:5050/api/auth/dev/clear-cache');
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
};

const ip = process.argv[2];
clearIPBan(ip);
