import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

// -- Helpers --

/**
 * Создает директорию, если она не существует
 * @param {string} dirPath - Путь к директории
 */
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

/**
 * Общая логика для создания хранилища multer
 * @param {string} subfolder - Подпапка в 'uploads/' (e.g., 'avatars', 'attachments')
 */
const createStorage = (subfolder) => {
    const uploadPath = path.join(process.cwd(), 'uploads', subfolder);
    ensureDirectoryExists(uploadPath);

    return multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = uuidv4();
            const extension = path.extname(file.originalname);
            cb(null, `${uniqueSuffix}${extension}`);
        }
    });
};

/**
 * Фильтр файлов по MIME-типу
 * @param {string[]} allowedMimes - Массив разрешенных MIME-типов
 */
const createFileFilter = (allowedMimes) => {
    return (req, file, cb) => {
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Недопустимый тип файла.'), false);
        }
    };
};


// -- Multer Instances --

// 1. Для аватаров (только изображения)
const avatarStorage = createStorage('avatars');
const avatarFileFilter = createFileFilter(['image/jpeg', 'image/png', 'image/gif']);

export const avatarUpload = multer({
    storage: avatarStorage,
    fileFilter: avatarFileFilter,
    limits: { fileSize: 1024 * 1024 * 2 } // 2 MB
});


// 2. Для вложений в заявках (изображения, документы)
const attachmentStorage = createStorage('attachments');
const attachmentFileFilter = createFileFilter([
    'image/jpeg', 'image/png', 'image/gif',
    'application/pdf',
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'text/plain' // .txt
]);

export const attachmentUpload = multer({
    storage: attachmentStorage,
    fileFilter: attachmentFileFilter,
    limits: { fileSize: 1024 * 1024 * 10 } // 10 MB
}); 