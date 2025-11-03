import cloudinary from '../config/cloudinary.js';
import fs from 'fs';

/**
 * Загружает файл в Cloudinary
 * @param {string} filePath - Путь к файлу на сервере
 * @param {string} folder - Папка в Cloudinary (avatars, attachments, etc.)
 * @param {string} resourceType - Тип ресурса (image, raw, video, auto)
 * @returns {Promise<Object>} - Результат загрузки с URL
 */
export const uploadToCloudinary = async (filePath, folder = 'birgekomek', resourceType = 'auto') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: resourceType,
      // Автоматическая оптимизация изображений
      quality: 'auto',
      fetch_format: 'auto',
    });

    // Удаляем временный файл после загрузки
    fs.unlinkSync(filePath);

    return {
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
    };
  } catch (error) {
    // Удаляем файл даже при ошибке
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    throw error;
  }
};

/**
 * Удаляет файл из Cloudinary
 * @param {string} publicId - Public ID файла в Cloudinary
 * @param {string} resourceType - Тип ресурса
 * @returns {Promise<Object>}
 */
export const deleteFromCloudinary = async (publicId, resourceType = 'image') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Ошибка при удалении из Cloudinary:', error);
    throw error;
  }
};

/**
 * Извлекает public_id из Cloudinary URL
 * @param {string} url - URL файла в Cloudinary
 * @returns {string} - Public ID
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  
  // Пример URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/filename.jpg
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  
  if (uploadIndex === -1) return null;
  
  // Берем все после 'upload' и версии (v1234567890)
  const pathAfterUpload = parts.slice(uploadIndex + 2).join('/');
  
  // Убираем расширение файла
  return pathAfterUpload.replace(/\.[^/.]+$/, '');
};
