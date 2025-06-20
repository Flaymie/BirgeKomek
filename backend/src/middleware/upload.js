import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Убедимся, что директория для загрузок существует
const uploadDir = 'uploads/avatars';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Настройка хранилища для multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Генерируем уникальное имя файла, чтобы избежать конфликтов
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `avatar-${req.user.id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Фильтр файлов, чтобы принимать только изображения
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedTypes.test(file.mimetype);
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Ошибка: Разрешены только файлы изображений (jpeg, jpg, png, gif, webp)!'));
};

const uploadAvatar = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // Лимит 5 МБ
  fileFilter: fileFilter
}).single('avatar'); // 'avatar' - это имя поля в форме

export { uploadAvatar }; 