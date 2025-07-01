import requestRoutes from './routes/requests.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chats.js';
import uploadRoutes from './routes/upload.js';
import statsRoutes from './routes/stats.js';
import botRoutes from './routes/bot.js';
import responsesRoutes from './routes/responses.js';

// Подключение маршрутов API
app.use('/api/requests', requestRoutes({ io }));
app.use('/api/auth', authRoutes({ sseConnections }));
app.use('/api/users', userRoutes({ sseConnections, io }));
app.use('/api/messages', messageRoutes({ io }));
app.use('/api/reviews', reviewRoutes({ io }));
app.use('/api/responses', responsesRoutes({ io }));
app.use('/api/notifications', notificationRoutes({ sseConnections }));
app.use('/api/chats', chatRoutes({ io }));
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/bot', botRoutes);

// Статические файлы
app.use('/uploads', express.static('uploads')); 