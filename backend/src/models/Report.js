import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    // Кто пожаловался
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // На что жалуемся
    targetType: {
      type: String,
      enum: ['User', 'Request'],
      required: true,
    },
    // ID того, на что жалуемся
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'targetType',
    },
    // Причина жалобы (текст от пользователя)
    reason: {
      type: String,
      required: [true, 'Причина жалобы обязательна'],
      trim: true,
      minlength: 10,
      maxlength: 2000
    },
    // Вложения
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
    // Статус жалобы
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'rejected'],
      default: 'open',
    },
    // Кто из модераторов взял в работу
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // Заметки модератора для служебного пользования
    moderatorNotes: {
      type: String,
      trim: true,
    },
    // Кто из модераторов и когда обработал
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