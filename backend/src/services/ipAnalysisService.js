import axios from 'axios';

/**
 * Анализирует IP-адрес с помощью внешнего API ip-api.com.
 * @param {string} ip - IP-адрес для анализа.
 * @returns {Promise<object | null>} Объект с данными об IP или null в случае ошибки.
 */
export const analyzeIp = async (ip) => {
  if (!ip) {
    console.error('[ipAnalysisService] IP-адрес не предоставлен.');
    return null;
  }

  // Для локальной разработки, где IP может быть '::1' или '127.0.0.1', 
  // API вернет ошибку. Мы можем либо пропустить анализ, либо использовать тестовый IP.
  // Для простоты пока пропустим.
  if (ip === '::1' || ip === '127.0.0.1') {
    console.log(`[ipAnalysisService] Пропущен анализ локального IP-адреса: ${ip}`);
    return { query: ip, status: 'success', country: 'Localhost', city: 'Local Dev', hosting: false, proxy: false };
  }

  try {
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,city,hosting,proxy,query`);
    const data = response.data;

    if (data.status === 'fail') {
      console.error(`[ipAnalysisService] Ошибка от API: ${data.message} для IP: ${ip}`);
      return null;
    }

    return data;
  } catch (error) {
    // Axios оборачивает ошибки, поэтому выводим error.response.data для подробностей, если есть
    const errorMessage = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error(`[ipAnalysisService] Не удалось выполнить запрос к ip-api.com для IP: ${ip}`, errorMessage);
    return null;
  }
}; 