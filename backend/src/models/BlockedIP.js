import mongoose from 'mongoose';

const blockedIPSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reason: {
    type: String,
    required: true
  },
  blockedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
});

// Автоматически удалять истекшие баны
blockedIPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const BlockedIP = mongoose.model('BlockedIP', blockedIPSchema);

export default BlockedIP;
