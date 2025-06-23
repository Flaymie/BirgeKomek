import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Проверяем и создаем директорию для загрузок, если ее нет
const uploadDir = 'uploads/avatars';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Папка для сохранения аватаров
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла, чтобы избежать конфликтов
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Фильтр для проверки типа файла
const fileFilter = (req, file, cb) => {
  // Принимаем только изображения
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Недопустимый тип файла! Разрешены только изображения.'), false);
  }
};

// Создаем middleware для загрузки аватара
const uploadAvatar = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 5 // Ограничение размера файла 5 МБ
  }
}).single('avatar'); // Ожидаем одно поле с именем 'avatar'

export default uploadAvatar; 