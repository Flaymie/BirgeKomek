import express from 'express';
import Message from '../models/Message.js';
import Request from '../models/Request.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// получить сообщения по requestId
router.get('/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // проверим, что запрос существует
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ msg: 'Запрос не найден' });
    }
    
    // проверяем права доступа (только участники могут видеть)
    if (
      request.author.toString() !== req.user._id.toString() && 
      (request.helper ? request.helper.toString() !== req.user._id.toString() : true)
    ) {
      return res.status(403).json({ msg: 'Нет доступа к этому чату' });
    }
    
    // получаем сообщения
    const messages = await Message.find({ requestId })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    console.error('Ошибка при получении сообщений:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

// отправить новое сообщение
router.post('/:requestId', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { content, attachments } = req.body;
    
    if (!content && (!attachments || attachments.length === 0)) {
      return res.status(400).json({ msg: 'Сообщение не может быть пустым' });
    }
    
    // проверим, что запрос существует
    const request = await Request.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ msg: 'Запрос не найден' });
    }
    
    // проверяем, что юзер участвует в запросе
    if (
      request.author.toString() !== req.user._id.toString() && 
      (request.helper ? request.helper.toString() !== req.user._id.toString() : true)
    ) {
      return res.status(403).json({ msg: 'Вы не можете писать в этот чат' });
    }
    
    // создаем сообщение
    const message = new Message({
      requestId,
      sender: req.user._id,
      content,
      attachments,
      readBy: [req.user._id] // отправитель уже прочитал
    });
    
    await message.save();
    
    // получаем с данными отправителя
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username');
    
    res.status(201).json(populatedMessage);
  } catch (err) {
    console.error('Ошибка при отправке сообщения:', err);
    res.status(500).json({ msg: 'Не получилось отправить сообщение' });
  }
});

// отметить сообщения как прочитанные
router.post('/:requestId/read', protect, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // обновляем все сообщения, которые еще не прочитаны пользователем
    const result = await Message.updateMany(
      { 
        requestId,
        readBy: { $ne: req.user._id },
        sender: { $ne: req.user._id } // не обновляем свои сообщения
      },
      { $addToSet: { readBy: req.user._id } }
    );
    
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error('Ошибка при пометке сообщений прочитанными:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

export default router; 