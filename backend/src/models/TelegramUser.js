import mongoose from 'mongoose';

const telegramUserSchema = new mongoose.Schema({
  telegramId: {
    type: String, // ID от Telegram - это большие числа, безопаснее хранить как строку
    required: true,
    unique: true,
    index: true, // Индекс для быстрого поиска по ID
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Ссылка на основную модель пользователя
    required: true,
    unique: true, // Один аккаунт на сайте = один аккаунт в Telegram
  },
  username: { // Опционально, можем хранить @username из Telegram
    type: String,
  },
}, { timestamps: true }); // Добавим метки времени создания/обновления

const TelegramUser = mongoose.model('TelegramUser', telegramUserSchema);

export default TelegramUser; 