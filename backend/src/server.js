import requestRoutes from './routes/requests.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import responseRoutes from './routes/responses.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chats.js';

// Подключение маршрутов API
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);

// Статические файлы
app.use('/uploads', express.static('uploads')); 