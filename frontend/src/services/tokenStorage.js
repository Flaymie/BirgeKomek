const TOKEN_KEY = 'authToken';

/**
 * Получает токен аутентификации из localStorage.
 * @returns {string|null} Токен или null, если он не найден.
 */
export const getAuthToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
        console.error("Не удалось получить токен из localStorage", e);
        return null;
    }
};

/**
 * Сохраняет токен аутентификации в localStorage.
 * @param {string} token - Токен для сохранения.
 */
export const setAuthToken = (token) => {
    if (!token) {
        return;
    }
    try {
        localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
        console.error("Не удалось сохранить токен в localStorage", e);
    }
};

/**
 * Удаляет токен аутентификации из localStorage.
 */
export const clearAuthToken = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
        console.error("Не удалось удалить токен из localStorage", e);
    }
}; 