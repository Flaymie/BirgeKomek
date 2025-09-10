import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import swaggerUi from 'swagger-ui-express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

// ГЛОБАЛЬНЫЕ ПРЕДОХРАНИТЕЛИ ОТ КРАШЕЙ
process.on('uncaughtException', (err) => {
  console.error('НЕПЕРЕХВАЧЕННАЯ ОШИБКА (UNCAUGHT EXCEPTION):', err);
  // В идеале здесь нужно слать уведомление админу, но пока просто логгируем, чтобы сервер не падал.
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('НЕОБРАБОТАННЫЙ ПРОМИС РЕДЖЕКТ (UNHANDLED REJECTION):', reason);
});


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
import adminRoutes from './routes/admin.js';
import reportRoutes from './routes/reports.js';
import systemReportsRoutes from './routes/systemReports.js';
import Message from './models/Message.js';
import Request from './models/Request.js';
import User from './models/User.js';
import { protectSocket } from './middleware/auth.js';
import multiAccountDetector from './middleware/multiAccountDetector.js';
import Notification from './models/Notification.js';


dotenv.config();

const sseConnections = {};

// Это нужно для __dirname в ES-модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.locals.loginTokens = new Map();
app.locals.passwordResetTokens = new Map();
app.locals.sseConnections = sseConnections;

const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:5050',
      'http://192.168.1.22:3000',
      'http://192.168.1.22:5050'
    ],
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5050;

// мидлвари
app.use(express.json());
// ЗАЩИТА ОТ ИНЪЕКЦИЙ
app.use(mongoSanitize());
app.use(xss());

app.use(helmet({ crossOriginResourcePolicy: false, crossOriginEmbedderPolicy: false }));

const allowedOrigins = ['http://localhost:3000', process.env.FRONTEND_URL];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS не разрешен'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(multiAccountDetector);

app.get('/uploads/:folder/:filename', (req, res) => {
  const { folder, filename } = req.params;

  if (filename.includes('..') || folder.includes('..')) {
    return res.status(400).send('Invalid path');
  }
  
  const filePath = path.join(__dirname, '..', 'uploads', folder, filename);

  res.sendFile(filePath, (err) => {
    if (err) {
      // Это предотвратит краш ERR_HTTP_HEADERS_SENT
      if (!res.headersSent) {
          res.status(404).send('Resource not found');
      }
    }
  });
});

app.disable('x-powered-by');

// подрубаем к монге с безопасными настройками
mongoose.connect(process.env.MONGODB_URI, {
  autoIndex: process.env.NODE_ENV === 'development',
})
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
app.use('/api/admin', adminRoutes({ sseConnections }));
app.use('/api/reports', reportRoutes({ io }));
app.use('/api/system-reports', systemReportsRoutes);

// ПРАВИЛЬНАЯ Socket.IO логика
io.use(protectSocket);

io.on('connection', (socket) => {
  // Теперь здесь socket.user - это ПОЛНОЦЕННЫЙ ОБЪЕКТ ПОЛЬЗОВАТЕЛЯ, а не кусок токена
  if (!socket.user || !socket.user.id) {
    console.error('[Socket.IO] Connection without user ID. Disconnecting.');
    return socket.disconnect();
  }

  const userId = socket.user.id;
  const onlineKey = `online:${userId}`;

  if (isRedisConnected()) {
    // Устанавливаем ключ с TTL (time-to-live) в 300 секунд (5 минут).
    // Если в течение этого времени не будет 'user_ping', Redis сам удалит ключ.
    redis.setex(onlineKey, 180, '1');
  }

  // Разово обновляем lastSeen при подключении, для надежности
  User.findByIdAndUpdate(userId, { lastSeen: new Date() }).exec();

  // Слушаем пинки от клиента
  socket.on('user_ping', () => {
    if (isRedisConnected()) {
      redis.expire(onlineKey, 180);
    }
  });

  socket.on('join_chat', (requestId) => {
    socket.join(requestId);
  });

  socket.on('leave_chat', (requestId) => {
    socket.leave(requestId);
  });

  socket.on('send_message', async (data) => {
    const { requestId, content } = data;

    if (!requestId) {
      console.error('Socket: Error - requestId is missing in received data');
      return socket.emit('message_error', { error: 'Request ID is missing.' });
    }

    try {
      const request = await Request.findById(requestId).lean();
      if (!request) {
        return socket.emit('message_error', { error: 'Request not found.' });
      }

      // Получаем всех пользователей, которые сейчас в чате
      const socketsInRoom = await io.in(requestId).fetchSockets();
      const userIdsInRoom = socketsInRoom.map(s => s.user.id);

      const senderId = socket.user.id;
      const isAuthor = request.author.toString() === senderId;
      const recipientId = isAuthor ? request.helper : request.author;
      
      const message = new Message({
        requestId: requestId,
        sender: senderId,
        content,
        // Сразу помечаем сообщение прочитанным для всех, кто в чате
        readBy: userIdsInRoom 
      });
      await message.save();
      await message.populate('sender', 'username avatar');

      io.to(requestId).emit('new_message', message);
      
      if (recipientId) {
        // Проверка, что получатель - не отправитель, и его нет в комнате
        const isRecipientInChat = userIdsInRoom.includes(recipientId.toString());
        
        if (senderId !== recipientId.toString() && !isRecipientInChat) {
            const senderUser = await User.findById(senderId).lean();
            await createAndSendNotification({
              user: recipientId,
              type: 'new_message_in_request',
              title: `Новое сообщение в заявке "${request.title}"`,
              message: `Пользователь ${senderUser.username} написал: ${content}`,
              link: `/requests/${requestId}/chat`,
              relatedEntity: { requestId: requestId, userId: senderId }
            });
        }
      }
    } catch (error) {
      console.error('Socket: Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  });

  // ИСПРАВЛЕННАЯ ЛОГИКА ИНДИКАТОРА ПЕЧАТИ(НАКОНЕЦ-ТО)
  const handleTyping = (eventName) => (data) => {
    const { chatId } = data;
    const { id, username } = socket.user;
    if (chatId) {
      // Транслируем то же самое событие, которое пришло, всем в комнате, кроме отправителя
      socket.to(chatId).emit(eventName, { 
        userId: id, 
        username: username,
        isTyping: eventName === 'typing_started',
        chatId: chatId 
      });
    }
  };

  socket.on('typing_started', handleTyping('typing_started'));
  socket.on('typing_stopped', handleTyping('typing_stopped'));

  // Продление активности при навигации
  socket.on('user_navigate', () => {
    if(isRedisConnected()) {
      redis.expire(onlineKey, 180); 
    }
  });

  // Обработчик для отметки всех уведомлений как прочитанных
  socket.on('mark_notifications_read', async (callback) => {
    try {
      const userId = socket.user.id;
      await Notification.updateMany(
        { user: userId, isRead: false },
        { $set: { isRead: true } }
      );
      callback({ success: true });
    } catch (error) {
      console.error('Ошибка при отметке уведомлений как прочитанных:', error);
      callback({ success: false, error: 'Ошибка сервера' });
    }
  });

  socket.on('disconnect', () => {
    if (isRedisConnected()) {
      redis.del(onlineKey);
    }
  });
});

// глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send({ error: 'Что-то пошло не так!' });
});

// обработка 404
app.use((req, res) => {
  res.status(404).json({ msg: 'Не найдено ничего' });
});

// Catch-all для неопределенных API роутов
app.all('/api/*', (req, res) => {
  res.status(404).json({ msg: 'Не найдено ничего' });
});

// Запускаем сервер
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на http://0.0.0.0:${PORT}`);
  console.log(`Документация API доступна по адресу http://localhost:${PORT}/api-docs`);
}); 