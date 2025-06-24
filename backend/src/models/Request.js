import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: Number,
    required: true,
    min: 1,
    max: 11
  },
  topic: {
    type: String,
    trim: true
  },
  time: {
    start: {
      type: Date,
      default: Date.now
    },
    end: {
      type: Date
    }
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  helper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['open', 'assigned', 'in_progress', 'completed', 'closed', 'cancelled'],
    default: 'open'
  },
  chatIsArchived: {
    type: Boolean,
    default: false
  },
  adminEditInfo: {
    editedBy: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User' 
    },
    reason: { 
      type: String,
      trim: true
    },
    editedAt: { 
      type: Date 
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Request = mongoose.model('Request', requestSchema);

export default Request; 