import requestRoutes from './routes/requests.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import responseRoutes from './routes/responses.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chats.js';
import uploadRoutes from './routes/upload.js';
import reviewsRoutes from './routes/reviews.js';
import statsRoutes from './routes/stats.js';
import telegramRoutes from './routes/telegram.js';
import botRoutes from './routes/bot.js';

// Подключение маршрутов API
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/responses', responsesRoutes({ onlineUsers, sseConnections, io }));
app.use('/api/reviews', reviewsRoutes({ onlineUsers, sseConnections, io }));
app.use('/api/stats', statsRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/bot', botRoutes);

// Статические файлы
app.use('/uploads', express.static('uploads')); 