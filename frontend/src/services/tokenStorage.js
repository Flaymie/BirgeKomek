const TOKEN_KEY = 'authToken';


export const getAuthToken = () => {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch (e) {
        console.error("Не удалось получить токен из localStorage", e);
        return null;
    }
};

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

export const clearAuthToken = () => {
    try {
        localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
        console.error("Не удалось удалить токен из localStorage", e);
    }
}; 