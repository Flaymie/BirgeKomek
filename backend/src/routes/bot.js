import express from 'express';
import axios from 'axios';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import mongoose from 'mongoose';

const router = express.Router();
const botToken = process.env.BOT_TOKEN;

// Роут для приема вебхуков от Telegram
router.post(`/webhook/${botToken}`, async (req, res) => {
    console.log('[Telegram Webhook] Получено обновление:', JSON.stringify(req.body, null, 2));

    const { callback_query } = req.body;

    // Обрабатываем только нажатия на инлайн-кнопки
    if (callback_query) {
        const { data, message } = callback_query;
        const [action, notificationId] = data.split('_');

        if (action === 'mark' && data.startsWith('mark_read_')) {
            const realNotificationId = data.substring('mark_read_'.length);
            
            console.log('[DEBUG] Webhook получил callback_query для отметки уведомления:', {
                realNotificationId,
                callbackQueryId: callback_query.id,
                fromUser: callback_query.from
            });
            
            try {
                // 1. Проверяем, существует ли уведомление
                console.log('[DEBUG] Проверяем существование уведомления с ID:', realNotificationId);
                const notificationExists = await Notification.findById(realNotificationId);
                console.log('[DEBUG] Результат проверки:', notificationExists ? 'Существует' : 'Не существует');
                
                // 2. Обновляем уведомление в нашей базе данных
                console.log('[DEBUG] Обновляем уведомление в базе данных');
                const notification = await Notification.findByIdAndUpdate(
                    realNotificationId, 
                    { isRead: true },
                    { new: true }
                );

                if (notification) {
                    console.log('[DEBUG] Уведомление успешно обновлено:', notification._id);
                    // 2. Отвечаем Telegram, что колбэк получен
                    await axios.post(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
                        callback_query_id: callback_query.id,
                        text: 'Уведомление отмечено как прочитанное.'
                    });

                    // 3. Редактируем исходное сообщение, чтобы изменить кнопку
                    await axios.post(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, {
                        chat_id: message.chat.id,
                        message_id: message.message_id,
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✓ Прочитано', callback_data: 'already_read' }
                            ]]
                        }
                    });
                     console.log(`[Telegram] Уведомление ${realNotificationId} помечено как прочитанное.`);
                } else {
                     console.log(`[Telegram] Уведомление ${realNotificationId} не найдено.`);
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

    // Всегда отвечаем 200 OK, чтобы Telegram не пытался повторно отправить вебхук
    res.sendStatus(200);
});

// Новый роут для обработки запросов от бота на отметку уведомления как прочитанного
router.post('/mark-notification-read', async (req, res) => {
    const { notificationId, telegramId } = req.body;
    
    console.log('🛠️ DEBUG: notificationId =', notificationId);
    console.log('🛠️ DEBUG: telegramId =', telegramId);
    console.log('🛠️ DEBUG: typeof telegramId =', typeof telegramId);
    
    if (!notificationId) {
        console.log('[DEBUG] Отсутствует ID уведомления');
        return res.status(400).json({ msg: 'Отсутствует ID уведомления' });
    }
    
    try {
        // Проверяем, является ли ID валидным ObjectId для MongoDB
        if (!mongoose.Types.ObjectId.isValid(notificationId)) {
            console.log('[DEBUG] Невалидный ObjectId:', notificationId);
            return res.status(400).json({ msg: 'Невалидный формат ID уведомления' });
        }
        
        // СНАЧАЛА ПРОСТО ПРОВЕРИМ, СУЩЕСТВУЕТ ЛИ УВЕДОМЛЕНИЕ ВООБЩЕ
        const notif = await Notification.findById(notificationId);
        if (!notif) {
            console.log('🔍 Уведомление НЕ НАЙДЕНО по ID:', notificationId);
            return res.status(404).json({ msg: 'Не найдено по ID вообще' });
        }
        
        console.log('🔍 Уведомление НАЙДЕНО:', JSON.stringify(notif, null, 2));
        
        // Обновляем уведомление
        const updatedNotif = await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
        );
        
        console.log('✅ Уведомление обновлено:', updatedNotif ? 'успешно' : 'ошибка');
        
        return res.status(200).json({ msg: 'Уведомление успешно отмечено как прочитанное' });
    } catch (error) {
        console.error('Ошибка при отметке уведомления как прочитанного:', error);
        return res.status(500).json({ msg: 'Ошибка сервера' });
    }
});

// Роут для установки вебхука (удобно для разработки)
router.get('/set-webhook', async (req, res) => {
    const serverUrl = process.env.SERVER_URL; // Например, https://your-domain.com
    if (!serverUrl) {
        return res.status(500).json({ msg: 'SERVER_URL не задан в .env' });
    }

    const webhookUrl = `${serverUrl}/api/bot/webhook/${botToken}`;

    try {
        const response = await axios.get(`https://api.telegram.org/bot${botToken}/setWebhook?url=${webhookUrl}`);
        console.log('Ответ от Telegram API:', response.data);
        res.status(200).json({ msg: `Вебхук успешно установлен на ${webhookUrl}`, details: response.data });
    } catch (error) {
        console.error('Ошибка установки вебхука:', error.response ? error.response.data : error.message);
        res.status(500).json({ msg: 'Не удалось установить вебхук', error: error.response ? error.response.data : error.message });
    }
});

export default router; 