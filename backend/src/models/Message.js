import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  requestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return !this.attachments || this.attachments.length === 0;
    },
    trim: true
  },
  attachments: [{
    fileUrl: { type: String, required: true },
    fileName: { type: String, required: true },
    fileType: { type: String },
    fileSize: { type: Number },
    width: { type: Number },
    height: { type: Number }
  }],
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  editedAt: {
    type: Date
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

export default Message; 