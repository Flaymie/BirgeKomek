import { api, serverURL } from './api';
import { toast } from 'react-toastify';

export const downloadFile = async (file) => {
  const fileUrl = `${serverURL}${file.fileUrl}`;
  
  try {
    const response = await api.get(fileUrl, {
      responseType: 'blob',
    });

    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', file.fileName);
    
    document.body.appendChild(link);
    link.click();
    
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    toast.error('Не удалось скачать файл. Попробуйте снова.');
  }
}; 