import express from 'express';
import Request from '../models/Request.js';
import { protect, isHelper } from '../middleware/auth.js';

const router = express.Router();

// получить все запросы
router.get('/', protect, async (req, res) => {
  try {
    const filters = {};
    
    // фильтры из query
    if (req.query.subject) filters.subject = req.query.subject;
    if (req.query.grade) filters.grade = req.query.grade;
    if (req.query.status) filters.status = req.query.status;
    
    // только открытые заявки по умолчанию
    if (!filters.status) {
      filters.status = 'open';
    }
    
    const requests = await Request.find(filters)
      .populate('author', 'username email rating')
      .sort({ createdAt: -1 });
    
    res.json(requests);
  } catch (err) {
    console.error('Ошибка при получении заявок:', err);
    res.status(500).json({ msg: 'Сломалось что-то на сервере' });
  }
});

// создать новую заявку
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, subject, grade, topic, format, time, isUrgent } = req.body;
    
    const request = new Request({
      title,
      description,
      subject,
      grade,
      topic,
      format,
      time,
      isUrgent,
      author: req.user._id
    });
    
    await request.save();
    
    res.status(201).json(request);
  } catch (err) {
    console.error('Ошибка при создании заявки:', err);
    res.status(500).json({ msg: 'Не удалось создать заявку' });
  }
});

// получить заявку по ID
router.get('/:id', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('author', 'username email rating')
      .populate('helper', 'username email rating');
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при получении заявки:', err);
    res.status(500).json({ msg: 'Что-то пошло не так' });
  }
});

// откликнуться на заявку (хелпер)
router.post('/:id/apply', protect, isHelper, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    if (request.status !== 'open') {
      return res.status(400).json({ msg: 'На эту заявку уже откликнулись' });
    }
    
    // обновляем заявку
    request.helper = req.user._id;
    request.status = 'assigned';
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при отклике на заявку:', err);
    res.status(500).json({ msg: 'Не удалось откликнуться на заявку' });
  }
});

// завершить заявку
router.post('/:id/complete', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    // только автор или хелпер могут завершить
    if (
      request.author.toString() !== req.user._id.toString() && 
      request.helper.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ msg: 'Нет прав на изменение этой заявки' });
    }
    
    if (request.status !== 'assigned') {
      return res.status(400).json({ msg: 'Можно завершить только назначенную заявку' });
    }
    
    // меняем статус
    request.status = 'completed';
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при завершении заявки:', err);
    res.status(500).json({ msg: 'Не удалось завершить заявку' });
  }
});

// отменить заявку
router.post('/:id/cancel', protect, async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    
    if (!request) {
      return res.status(404).json({ msg: 'Заявка не найдена' });
    }
    
    // только автор может отменить
    if (request.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ msg: 'Только автор может отменить заявку' });
    }
    
    if (request.status === 'completed' || request.status === 'cancelled') {
      return res.status(400).json({ msg: 'Нельзя отменить завершенную или отмененную заявку' });
    }
    
    request.status = 'cancelled';
    
    await request.save();
    
    res.json(request);
  } catch (err) {
    console.error('Ошибка при отмене заявки:', err);
    res.status(500).json({ msg: 'Не удалось отменить заявку' });
  }
});

export default router; 