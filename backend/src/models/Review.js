import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  helperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    trim: true
  },
  isResolved: {
    type: Boolean,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// ИНДЕКС УДАЛЕН ЧТОБЫ РАЗРЕШИТЬ МНОЖЕСТВЕННЫЕ ОТЗЫВЫ
// reviewSchema.index({ requestId: 1, reviewerId: 1 }, { unique: true });

const Review = mongoose.model('Review', reviewSchema);

export default Review; 