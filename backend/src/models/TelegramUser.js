import mongoose from 'mongoose';

const telegramUserSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  username: {
    type: String,
  },
}, { timestamps: true });

const TelegramUser = mongoose.model('TelegramUser', telegramUserSchema);

export default TelegramUser; 