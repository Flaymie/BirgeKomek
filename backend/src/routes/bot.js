import express from 'express';
import axios from 'axios';
import Notification from '../models/Notification.js';
import mongoose from 'mongoose';

const router = express.Router();
const botToken = process.env.BOT_TOKEN;

// Роут для приема вебхуков от Telegram
router.post(`/webhook/${botToken}`, async (req, res) => {

    const { callback_query } = req.body;

    if (callback_query) {
        const { data, message } = callback_query;
        const [action, notificationId] = data.split('_');

        if (action === 'mark' && data.startsWith('mark_read_')) {
            const realNotificationId = data.substring('mark_read_'.length);
            
            try {
                const notificationExists = await Notification.findById(realNotificationId);
                
                const notification = await Notification.findByIdAndUpdate(
                    realNotificationId, 
                    { isRead: true },
                    { new: true }
                );

                if (notification) {
                    await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                        callback_query_id: callback_query.id,
                        text: 'Уведомление отмечено как прочитанное.'
                    });

                    await axios.post(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
                        chat_id: message.chat.id,
                        message_id: message.message_id,
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✓ Прочитано', callback_data: 'already_read' }
                            ]]
                        }
                    });
                } else {
                     await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                        callback_query_id: callback_query.id,
                        text: 'Ошибка: уведомление не найдено.',
                        show_alert: true
                    });
                }
            } catch (error) {
                console.error('[Telegram Webhook] Ошибка обработки callback_query:', error.response ? error.response.data : error.message);
            }
        }
    }

    // Всегда отвечаем 200 OK, чтобы Telegram не пытался повторно отправить вебхук(а то наспамит ещё)
    res.sendStatus(200);
});

router.post('/mark-notification-read', async (req, res) => {
    const { notificationId, telegramId } = req.body;
    
    
    if (!notificationId) {
        return res.status(400).json({ msg: 'Отсутствует ID уведомления' });
    }
    
    try {
        // Проверяем, является ли ID валидным ObjectId для MongoDB
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            return res.status(400).json({ msg: 'Невалидный формат ID уведомления' });
        }
        
        // СНАЧАЛА ПРОСТО ПРОВЕРИМ, СУЩЕСТВУЕТ ЛИ УВЕДОМЛЕНИЕ ВООБЩЕ
        const notif = await Notification.findById(notificationId);
        if (!notif) {
            return res.status(404).json({ msg: 'Не найдено по ID вообще' });
        }
        
        
        return res.status(200).json({ msg: 'Уведомление успешно отмечено как прочитанное' });
    } catch (error) {
        console.error('Ошибка при отметке уведомления как прочитанного:', error);
        return res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// Роут для установки вебхука
router.get('/set-webhook', async (req, res) => {
    const serverUrl = process.env.SERVER_URL;
    if (!serverUrl) {
        return res.status(500).json({ msg: 'SERVER_URL не задан в .env' });
    }

    const webhookUrl = `${serverUrl}/api/bot/webhook/${botToken}`;

    try {
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`);
        res.status(200).json({ msg: `Вебхук успешно установлен на ${webhookUrl}`, details: response.data });
    } catch (error) {
        console.error('Ошибка установки вебхука:', error.response ? error.response.data : error.message);
        res.status(500).json({ msg: 'Не удалось установить вебхук', error: error.response ? error.response.data : error.message });
    }
});

export default router; 