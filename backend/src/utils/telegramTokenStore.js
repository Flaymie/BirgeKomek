// Временное хранилище для токенов аутентификации Telegram.
// В полноценном приложении стоит заменить на Redis или другую быструю in-memory базу данных.

const telegramTokens = new Map();

export { telegramTokens }; 