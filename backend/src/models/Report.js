import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    targetType: {
      type: String,
      enum: ['User', 'Request'],
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    reason: {
      type: String,
      required: [true, 'Причина жалобы обязательна'],
      trim: true,
      minlength: 10,
      maxlength: 2000
    },
    attachments: [{
        originalName: String,
        filename: String, 
        path: String,
        mimetype: String,
        size: Number,
    }],
    moderatorComment: {
        type: String,
        maxlength: 1000,
        trim: true,
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'rejected'],
      default: 'open',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    moderatorNotes: {
      type: String,
      trim: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const Report = mongoose.model('Report', reportSchema);

export default Report; 