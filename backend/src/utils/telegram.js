import axios from 'axios';

/**
 * Отправляет форматированное сообщение пользователю в Telegram.
 * @param {string} telegramId - ID чата/пользователя в Telegram.
 * @param {string} message - Текст сообщения. Поддерживает Markdown.
 */
export const sendTelegramMessage = async (telegramId, message) => {
  if (!telegramId || !process.env.BOT_TOKEN) {
    console.log('Не удалось отправить сообщение в Telegram: отсутствует ID пользователя или токен бота.');
    return;
  }
  const url = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: telegramId,
      text: message,
      parse_mode: 'Markdown',
    });
    console.log(`Сообщение успешно отправлено в Telegram пользователю ${telegramId}`);
  } catch (error) {
    console.error(`Ошибка при отправке сообщения в Telegram для ${telegramId}:`, error.response ? error.response.data : error.message);
  }
}; 