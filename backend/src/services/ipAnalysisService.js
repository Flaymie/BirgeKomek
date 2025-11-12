import axios from 'axios';

/**
 * Проверяет является ли IP приватным (локальным)
 */
const isPrivateIp = (ip) => {
  // IPv4 приватные диапазоны
  const privateRanges = [
    /^10\./,                    // 10.0.0.0 - 10.255.255.255
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0 - 172.31.255.255
    /^192\.168\./,              // 192.168.0.0 - 192.168.255.255
    /^127\./,                   // 127.0.0.0 - 127.255.255.255 (loopback)
    /^169\.254\./,              // 169.254.0.0 - 169.254.255.255 (link-local)
  ];
  
  // IPv6 локальные адреса
  if (ip === '::1' || ip === '::' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }
  
  return privateRanges.some(range => range.test(ip));
};

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

  // Для локальной разработки и приватных IP адресов
  if (isPrivateIp(ip)) {
    console.log(`[ipAnalysisService] Пропущен анализ приватного/локального IP-адреса: ${ip}`);
    return { query: ip, status: 'success', country: 'Private Network', city: 'Local', isHosting: false, isProxy: false };
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