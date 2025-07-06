import express from 'express';
import path from 'path';
import fs from 'fs';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Роут для скачивания вложений
// GET /api/download/attachments/:filename
router.get('/attachments/:filename', protect, (req, res) => {
  try {
    const { filename } = req.params;
    
    // Валидация, чтобы не дать скачать что-то за пределами папки
    if (filename.includes('..') || filename.includes('/')) {
        return res.status(400).send('Некорректное имя файла.');
    }

    const directoryPath = path.resolve(process.cwd(), 'uploads/attachments');
    const filePath = path.join(directoryPath, filename);

    // Проверяем, существует ли файл
    if (fs.existsSync(filePath)) {
        // res.download() автоматически установит Content-Disposition: attachment
        res.download(filePath, (err) => {
            if (err) {
                console.error("Ошибка при отправке файла:", err);
                // Важно: если заголовки уже отправлены, может возникнуть ошибка при попытке отправить статус
                if (!res.headersSent) {
                    res.status(500).send('Не удалось скачать файл.');
                }
            }
        });
    } else {
        res.status(404).send('Файл не найден.');
    }
  } catch(error) {
      console.error("Критическая ошибка в роуте скачивания:", error);
      res.status(500).send('Внутренняя ошибка сервера.');
  }
});

export default router; 