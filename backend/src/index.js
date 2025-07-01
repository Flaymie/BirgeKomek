import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import http from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

import redis, { isRedisConnected } from './config/redis.js';
import swaggerSpecs from './config/swagger.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';
import responseRoutes from './routes/responses.js';
import reviewRoutes from './routes/reviews.js';
import userRoutes from './routes/users.js';
import notificationRoutes, { createAndSendNotification } from './routes/notifications.js';
import statsRoutes from './routes/stats.js';
import chatRoutes from './routes/chats.js';
import uploadRoutes from './routes/upload.js';
import Message from './models/Message.js';
import Request from './models/Request.js';
import User from './models/User.js';

dotenv.config();

// --- ОБЪЕКТЫ ДЛЯ ХРАНЕНИЯ СОСТОЯНИЯ ONLINE ---
// Для SSE (уведомления о бане и т.д.)
const sseConnections = {};
// Для Socket.IO (статус "онлайн", чаты)
// const onlineUsers = new Map(); // БОЛЬШЕ НЕ ИСПОЛЬЗУЕТСЯ, ЗАМЕНЕНО НА REDIS

// Это нужно для __dirname в ES-модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// --- ГЛОБАЛЬНЫЕ ХРАНИЛИЩА ---
app.locals.loginTokens = new Map();
app.locals.passwordResetTokens = new Map();
app.locals.sseConnections = sseConnections;
// app.locals.onlineUsers = onlineUsers; // БОЛЬШE НЕ ИСПОЛЬЗУЕТСЯ

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5050',
      'http://192.168.1.87:3000',
      'http://192.168.1.87:5050'
    ],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5050;

// мидлвари
app.use(express.json());
app.use(mongoSanitize());
app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));

const whitelist = [
  'http://localhost:3000',
  'http://localhost:5050',
  'http://192.168.1.87:3000',
  'http://192.168.1.87:5050',
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

app.use(cors(corsOptions));

// НОВЫЙ, НАДЕЖНЫЙ РОУТ ДЛЯ РАЗДАЧИ ФАЙЛОВ
// Он будет обрабатывать запросы вида /uploads/avatars/filename.png
app.get('/uploads/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;

  // Простая проверка безопасности
  if (filename.includes('..') || folder.includes('..')) {
    return res.status(400).send('Invalid path');
  }
  
  // Строим абсолютный путь к файлу
  const filePath = path.join(__dirname, '..', 'uploads', folder, filename);

  // Отправляем файл. Express сам выставит нужные заголовки.
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Ошибка отправки файла: ${filePath}`, err);
      res.status(404).send('Resource not found');
    }
  });
});

// отключаем строку X-Powered-By
app.disable('x-powered-by');

// подрубаем к монге с безопасными настройками
mongoose.connect(process.env.MONGODB_URI, {
  autoIndex: process.env.NODE_ENV === 'development', // отключаем автоиндексацию в проде
})
  .then(() => console.log('MongoDB подключена'))
  .catch(err => console.error('MongoDB не подключена:', err));

// документация API
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, { 
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Бірге Көмек API Docs'
}));

// роуты
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes({ io }));
app.use('/api/responses', responseRoutes({ io }));
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes({ sseConnections, io }));
app.use('/api/notifications', notificationRoutes({ sseConnections }));
app.use('/api/stats', statsRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/upload', uploadRoutes);

// Socket.IO логика
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: Token not provided'));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
    socket.user = decoded; // Сохраняем данные пользователя в сокете
    next();
  });
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User connected: ${socket.user.id}`);
  const userId = socket.user.id;
  const onlineKey = `online:${userId}`;

  if (isRedisConnected()) {
    // Устанавливаем ключ с TTL (time-to-live) в 60 секунд.
    // Если в течение 60с не будет 'user_ping', Redis сам удалит ключ.
    redis.setex(onlineKey, 120, '1');
  }

  // Разово обновляем lastSeen при подключении, для надежности
  User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();

  // Слушаем пинги от клиента
  socket.on('user_ping', () => {
    // Просто обновляем TTL ключа еще на 60 секунд
    if (isRedisConnected()) {
      redis.expire(onlineKey, 120);
    }
  });

  socket.on('join_chat', (requestId) => {
    socket.join(requestId);
    console.log(`User ${socket.user.id} joined chat for request ${requestId}`);
  });

  socket.on('send_message', async (data) => {
    const { requestId, content, attachment } = data;

    if (!requestId) {
      console.error('Socket: Error - requestId is missing in received data');
      return socket.emit('message_error', { error: 'Request ID is missing.' });
    }

    try {
      const request = await Request.findById(requestId).lean();
      if (!request) {
        return socket.emit('message_error', { error: 'Request not found.' });
      }

      const senderId = socket.user.id;
      const isAuthor = request.author.toString() === senderId;
      const recipientId = isAuthor ? request.helper : request.author;
      
      const message = new Message({
        requestId: requestId,
        sender: senderId,
        content,
      });
      await message.save();
      await message.populate('sender', 'username avatar');

      io.to(requestId).emit('new_message', message);
      
      if (recipientId) {
        const senderUser = await User.findById(senderId).lean();
        await createAndSendNotification(sseConnections, {
          user: recipientId,
          type: 'new_message_in_request',
          title: `Новое сообщение в чате: "${request.title}"`,
          message: `${senderUser.username}: ${content.substring(0, 50)}...`,
          link: `/requests/${requestId}/chat`, // ПРАВИЛЬНАЯ ССЫЛКА
          relatedEntity: { requestId: requestId, userId: senderId }
        });
      }
    } catch (error) {
      console.error('Socket: Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ИСПРАВЛЕННАЯ ЛОГИКА ИНДИКАТОРА ПЕЧАТИ
  const handleTyping = (eventName) => (data) => {
    const { chatId } = data;
    const { id, username } = socket.user;
    if (chatId) {
      // Транслируем то же самое событие, которое пришло, всем в комнате, кроме отправителя
      socket.to(chatId).emit(eventName, { 
        userId: id, 
        username: username,
        isTyping: eventName === 'typing_started', // true для started, false для stopped
        chatId: chatId 
      });
    }
  };

  socket.on('typing_started', handleTyping('typing_started'));
  socket.on('typing_stopped', handleTyping('typing_stopped'));

  socket.on('user_active', (userId) => {
    if (userId) {
      if (isRedisConnected()) {
        const onlineKey = `online:${userId}`;
        // Устанавливаем ключ со временем жизни 60 секунд
        redis.setex(onlineKey, 120, '1');
      }
    }
  });

  // Продление активности при навигации
  socket.on('user_navigate', (userId) => {
    if(userId) {
      if(isRedisConnected()) {
        const onlineKey = `online:${userId}`;
        redis.expire(onlineKey, 120);
      }
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] User disconnected: ${socket.user.id}`);
    if (isRedisConnected()) {
      // Можно удалить ключ сразу, но лучше положиться на TTL для надежности
      redis.del(onlineKey);
    }
  });
});

// Периодическая проверка "мертвых душ"
setInterval(() => {
  const now = Date.now();
  const timeout = 90 * 1000; // 1.5 минуты неактивности
  
  // onlineUsers.forEach((timestamp, userId) => {
  //   if (now - timestamp > timeout) {
  //     onlineUsers.delete(userId);
  //     console.log(`[Socket.IO Cleaner] Removed stale user: ${userId}`);
  //     // Можно и здесь обновить lastSeen, но disconnect должен справляться
  //     User.findByIdAndUpdate(userId, { lastSeen: new Date(timestamp) }).exec();
  //   }
  // });
}, 60 * 1000); // Проверка каждую минуту

// глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Что-то пошло не так!' });
});

// простой тест что сервак живой
app.get('/', (req, res) => {
  res.send('Бірге Көмек API запущен');
});

// обработка 404
app.use((req, res) => {
  console.log(`[404 Handler] Path not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ msg: 'Не найдено ничего' });
});

// Запускаем сервер
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
  console.log(`Документация API доступна по адресу http://localhost:${PORT}/api-docs`);
}); 