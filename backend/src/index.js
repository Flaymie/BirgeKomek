import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerSpecs from './config/swagger.js';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';
import userRoutes from './routes/users.js';
import notificationRoutes from './routes/notifications.js';
import statsRoutes from './routes/stats.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// мидлвари
app.use(cors());
app.use(express.json({ limit: '10kb' })); // ограничение размера JSON
app.use(morgan('dev'));

// защита от NoSQL инъекций
app.use(mongoSanitize());

// установка безопасных HTTP заголовков
app.use(helmet());

// отключаем строку X-Powered-By
app.disable('x-powered-by');

// Настройка rate limiter для API (общая)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 200, // Максимум 200 запросов с одного IP за 15 минут (увеличил немного)
    standardHeaders: true, 
    legacyHeaders: false, 
    message: 'Слишком много запросов с вашего IP, попробуйте позже.',
});
app.use('/api', apiLimiter); 

// Отдельный, более строгий rate limiter для эндпоинтов аутентификации
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 10, // Максимум 10 попыток с одного IP за 1 час (увеличил для регистрации/восстановления)
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Слишком много попыток аутентификации с вашего IP, попробуйте через час.',
    skip: (req, res) => req.path === '/api/auth/check' || req.path === '/api/auth/refresh-token', // Исключаем /check и /refresh-token из строгого лимита
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
// Если есть эндпоинт восстановления пароля, его тоже стоит добавить под authLimiter
// app.use('/api/auth/forgot-password', authLimiter);
// app.use('/api/auth/reset-password', authLimiter);

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
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stats', statsRoutes);

// глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Что-то пошло не так на сервере';
  
  // не показываем стек ошибок в продакшене
  const error = process.env.NODE_ENV === 'development' 
    ? { message, stack: err.stack } 
    : { message };
    
  res.status(statusCode).json({ 
    success: false, 
    error 
  });
});

// простой тест что сервак живой
app.get('/', (req, res) => {
  res.send('Бірге Көмек API запущен');
});

// обработка 404
app.use((req, res) => {
  res.status(404).json({ msg: 'Не найдено ничего' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Документация API доступна по адресу http://localhost:${PORT}/api-docs`);
}); 