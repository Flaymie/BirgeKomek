import requestRoutes from './routes/requests.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import responseRoutes from './routes/responses.js';
import notificationRoutes from './routes/notifications.js';
import chatRoutes from './routes/chats.js';
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';

dotenv.config();
connectDB();

const app = express();

// Настройки middleware (cors, express.json)
app.use(cors());
app.use(express.json());

// Раздача статических файлов (аватаров, вложений)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Подключение маршрутов API
app.use('/api/requests', requestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/responses', responseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chats', chatRoutes);

// Остальной код сервера

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
}); 