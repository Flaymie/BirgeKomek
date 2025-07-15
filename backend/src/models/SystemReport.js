import mongoose from 'mongoose';

const systemReportSchema = new mongoose.Schema({
  // Пользователь, на которого система обратила внимание
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Тип системного события
  type: {
    type: String,
    required: true,
    enum: [
        'suspicion_registration', // Подозрительная регистрация
        'unusual_activity',       // Необычная активность (задел на будущее)
        'multiple_accounts'       // Явное обнаружение мультиаккаунта (задел на будущее)
    ],
  },
  // Детали события, чтобы модератор понял, что произошло
  details: {
    score: Number,
    log: [{
        reason: String,
        points: Number,
        timestamp: Date
    }],
    ip: String,
    // Можно будет добавлять еще данные, например, fingerprint
  },
  // Статус репорта
  status: {
    type: String,
    required: true,
    enum: ['new', 'resolved'],
    default: 'new',
    index: true,
  },
  // Модератор, который разобрал этот случай
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

const SystemReport = mongoose.model('SystemReport', systemReportSchema);

export default SystemReport; 