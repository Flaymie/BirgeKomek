import axios from 'axios';
import { api, serverURL } from './api';
import { toast } from 'react-toastify';

export const downloadFile = async (file) => {
  try {
    // Поддержка разных имен полей: fileUrl | path | url
    const raw = file?.fileUrl || file?.path || file?.url;
    if (!raw || typeof raw !== 'string') {
      toast.error('Некорректный URL файла');
      return;
    }

    // Определяем абсолютный ли URL
    const isAbsolute = /^https?:\/\//i.test(raw);
    // Нормализуем слеши и собираем конечный URL
    const base = serverURL.replace(/\/$/, '');
    const path = raw.replace(/^\/+/, '');
    const fileUrl = isAbsolute ? raw : `${base}/${path}`;
    const safeUrl = encodeURI(fileUrl);

    // Служебный лог для отладки (не toast)
    // eslint-disable-next-line no-console
    console.debug('downloadFile ->', { raw, fileUrl: safeUrl });

    let response;
    try {
      // 1) Пробуем через авторизованный клиент (если ресурс защищен)
      response = await api.get(safeUrl, { responseType: 'blob' });
    } catch (e) {
      // 2) Если не вышло (например, статика без CORS для Authorization), пробуем без заголовков
      response = await axios.get(safeUrl, { responseType: 'blob' });
    }

    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    // Пытаемся подобрать имя файла из заголовка или из объекта
    let filename = file?.fileName || file?.originalName || 'file';
    const disposition = response.headers?.['content-disposition'] || response.headers?.get?.('content-disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename\*=UTF-8''([^;]+)|filename="?([^";]+)"?/);
      const encoded = match?.[1] || match?.[2];
      if (encoded) {
        try { filename = decodeURIComponent(encoded); } catch { filename = encoded; }
      }
    }
    link.setAttribute('download', filename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error('Ошибка при скачивании файла:', error);
    // const status = error?.response?.status;
    // const msg = error?.response?.data?.msg || error?.message;
    // Падаем в запасной вариант: открываем файл напрямую в новой вкладке/скачивании браузером
    try {
      const raw = file?.fileUrl || file?.path || file?.url;
      const isAbsolute = /^https?:\/\//i.test(raw || '');
      const base = serverURL.replace(/\/$/, '');
      const path = (raw || '').replace(/^\/+/, '');
      const directUrl = isAbsolute ? raw : `${base}/${path}`;
      if (directUrl) {
        const a = document.createElement('a');
        a.href = directUrl;
        a.download = file?.fileName || file?.originalName || '';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
    } catch (fallbackErr) {
      console.error('Fallback download failed:', fallbackErr);
    }
    toast.error('Не удалось скачать файл. Попробуйте снова.');
  }
};