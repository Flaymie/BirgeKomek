import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import requestRoutes from './routes/requests.js';
import messageRoutes from './routes/messages.js';
import reviewRoutes from './routes/reviews.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// мидлвари
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// подрубаем к монге
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB подключена'))
  .catch(err => console.error('MongoDB не подключена:', err));

// роуты
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reviews', reviewRoutes);

// простой тест что сервак живой
app.get('/', (req, res) => {
  res.send('PeerHelp API запущен');
});

// обработка 404
app.use((req, res) => {
  res.status(404).json({ msg: 'Не найдено ничего' });
});

app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
}); 