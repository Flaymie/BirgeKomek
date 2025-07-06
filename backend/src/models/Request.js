import mongoose from 'mongoose';

const requestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String
  },
  subject: {
    type: String,
    trim: true
  },
  grade: {
    type: Number,
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
    enum: ['draft', 'open', 'assigned', 'in_progress', 'completed', 'cancelled', 'closed'],
    default: 'open'
  },
  editedByAdminInfo: {
    editorId: {
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
  },
  attachments: [{
    filename: String,
    path: String,
    mimetype: String,
    size: Number,
    originalName: String
  }]
}, { timestamps: true });

const Request = mongoose.model('Request', requestSchema);

export default Request; 