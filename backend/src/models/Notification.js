import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userTelegramId: {
    type: String,
    index: true,
  },
  type: {
    type: String,
    required: true,
    enum: [
      'new_request_for_subject', // Новая заявка по твоему предмету (для хелперов)
      'request_assigned_to_you', // Заявка назначена на тебя (для хелпера)
      'request_taken_by_helper', // Твою заявку взял хелпер (для автора заявки)
      'new_response_to_request', // Новый отклик на вашу заявку (для автора заявки)
      'response_accepted',       // Ваш отклик приняли (для хелпера)
      'response_rejected',       // Ваш отклик отклонили (для хелпера)
      'new_message_in_request',  // Новое сообщение в чате заявки
      'request_marked_completed',// Заявка отмечена как выполненная (и для автора, и для хелпера)
      'new_review_for_you',      // О тебе оставили новый отзыв (для хелпера)
      'request_status_changed',  // Общее изменение статуса заявки
      'request_deleted_by_admin',         // Заявка была удалена
      'request_edited_by_admin',          // Заявка была отредактирована
      'request_reopened_by_author', // Автор переоткрыл заявку (для хелпера)
      'request_reopened_by_you',    // Ты переоткрыл заявку (для автора)
      'security_alert',             // Уведомление безопасности (смена пароля и т.д.)
      'request_completed',          // Заявка завершена (после оценки)
      'moderator_warning',          // Предупреждение от модератора
      'new_report',                 // Новая жалоба (для модераторов)
      'report_status_changed',      // Статус жалобы изменен (для автора жалобы)
      'profile_updated_by_admin',   // Профиль обновлен админом (для пользователя)
    ],
  },
  title: {
    type: String, 
    required: true,
  },
  message: {
    type: String,
  },
  link: {
    type: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  relatedEntity: {
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Request' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  }
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);


export default Notification; 