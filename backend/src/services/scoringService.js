/**
 * Сервис для подсчета очков подозрительности (Suspicion Score).
 */

const SCORING_RULES = {
  IP_HOSTING: { points: 15, reason: 'IP-адрес принадлежит хостингу или дата-центру.' },
  IP_PROXY: { points: 20, reason: 'IP-адрес является известным прокси/VPN.' }
};

/**
 * Рассчитывает очки подозрительности для нового пользователя на основе данных регистрации.
 * @param {object} user - Объект пользователя, содержащий registrationDetails.
 * @returns {{score: number, log: Array<{reason: string, points: number}>}} - Итоговый счет и лог начислений.
 */
export const calculateRegistrationScore = (user) => {
  const log = [];
  let score = 0;

  const ipInfo = user.registrationDetails?.ipInfo;

  if (!ipInfo) {
    return { score, log };
  }

  // Правило 1: IP-адрес хостинга/VPN
  if (ipInfo.hosting) {
    score += SCORING_RULES.IP_HOSTING.points;
    log.push({ reason: SCORING_RULES.IP_HOSTING.reason, points: SCORING_RULES.IP_HOSTING.points });
  }
  
  // Правило 2: IP-адрес прокси
  if (ipInfo.proxy) {
    score += SCORING_RULES.IP_PROXY.points;
    log.push({ reason: SCORING_RULES.IP_PROXY.reason, points: SCORING_RULES.IP_PROXY.points });
  }

  // Сюда в будущем можно будет добавлять другие правила, например, для fingerprinting.

  return { score, log };
}; 