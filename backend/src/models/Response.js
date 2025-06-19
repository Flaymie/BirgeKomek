import mongoose from 'mongoose';

const responseSchema = new mongoose.Schema({
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true,
    index: true
  },
  helper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  message: {
    type: String,
    trim: true,
    required: true,
    maxlength: 500
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  }
}, { timestamps: true });

const Response = mongoose.model('Response', responseSchema);

export default Response; 