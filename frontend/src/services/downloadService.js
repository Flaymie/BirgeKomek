import { toast } from 'react-toastify';
import { serverURL } from './api';

export const downloadFile = async (file) => {
  if (!file || !file.fileUrl) {
    toast.error('Файл для скачивания не найден.');
    console.error('Download error: file or file.fileUrl is missing.', file);
    return;
  }

  // Строим полный URL к файлу
  const fileUrl = `${serverURL}${file.fileUrl}`;

  try {
    // Уведомляем пользователя о начале скачивания
    toast.info(`Начинается скачивание: ${file.fileName}`);
    
    // 1. Запрашиваем файл с сервера
    const response = await fetch(fileUrl);
    
    // Проверяем, что сервер ответил успешно
    if (!response.ok) {
      throw new Error(`Ошибка сети: ${response.statusText}`);
    }
    
    // 2. Получаем содержимое файла как Blob (Binary Large Object)
    const blob = await response.blob();
    
    // 3. Создаем временную ссылку на этот Blob
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // 4. Устанавливаем имя файла для скачивания
    link.download = file.fileName || 'downloaded-file';
    
    // 5. Симулируем клик по ссылке, чтобы вызвать диалог скачивания
    document.body.appendChild(link); // Firefox требует, чтобы ссылка была в DOM
    link.click();
    
    // 6. Убираем временную ссылку из DOM
    document.body.removeChild(link);
    
    // 7. Освобождаем память, занятую временной ссылкой
    URL.revokeObjectURL(link.href);

  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    toast.error('Не удалось скачать файл. Попробуйте позже.');
  }
}; 