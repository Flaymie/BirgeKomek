import express from 'express';
import SystemReport from '../models/SystemReport.js';
import { protect, isModOrAdmin } from '../middleware/auth.js';

const router = express.Router();

// @route   GET api/system-reports
// @desc    Получить все системные репорты
// @access  Private (Admin, Moderator)
router.get('/', [protect, isModOrAdmin], async (req, res) => {
  try {
    const { status = 'new' } = req.query; // По умолчанию получаем только новые
    
    const reports = await SystemReport.find({ status })
      .populate('targetUser', 'username avatar roles banDetails suspicionScore')
      .sort({ createdAt: -1 });
      
    res.json(reports);
  } catch (error) {
    console.error('Ошибка при получении системных репортов:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// @route   GET api/system-reports/:id
// @desc    Получить один системный репорт по ID
// @access  Private (Admin, Moderator)
router.get('/:id', [protect, isModOrAdmin], async (req, res) => {
    try {
        const report = await SystemReport.findById(req.params.id)
            .populate('targetUser') 
            .populate('resolvedBy', 'username');

        if (!report) {
            return res.status(404).json({ msg: 'Системный репорт не найден' });
        }

        res.json(report);
    } catch (error) {
        console.error(`Ошибка при получении системного репорта ${req.params.id}:`, error);
        res.status(500).send('Ошибка сервера');
    }
});

// @route   POST api/system-reports/:id/resolve
// @desc    Пометить репорт как "рассмотренный"
// @access  Private (Admin, Moderator)
router.post('/:id/resolve', [protect, isModOrAdmin], async (req, res) => {
    try {
        const report = await SystemReport.findById(req.params.id);

        if (!report) {
            return res.status(404).json({ msg: 'Репорт не найден' });
        }
        
        if (report.status === 'resolved') {
            return res.status(400).json({ msg: 'Этот репорт уже был рассмотрен' });
        }

        report.status = 'resolved';
        report.resolvedBy = req.user.id;
        report.notes = req.body.notes || ''; // Модератор может оставить заметку

        await report.save();

        const populatedReport = await report.populate('resolvedBy', 'username');

        res.json(populatedReport);
    } catch (error) {
        console.error('Ошибка при разрешении репорта:', error);
        res.status(500).send('Ошибка сервера');
    }
});


export default router; 