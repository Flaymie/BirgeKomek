import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Настройка для ES Modules ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// --- Импорт моделей ---
import User from '../models/User.js';
import Request from '../models/Request.js';
import Response from '../models/Response.js';
import Message from '../models/Message.js';
import Review from '../models/Review.js';

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB подключена...');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

// --- Демо-данные ---
const usersData = [
  {
    username: 'admin',
    password: 'password123',
    roles: { admin: true },
    phone: '+77770000001',
    telegramId: '100000001',
    firstName: 'Админ',
    lastName: 'Админов',
    grade: 11,
  },
  {
    username: 'moderator',
    password: 'password123',
    roles: { moderator: true },
    phone: '+77770000002',
    telegramId: '100000002',
    firstName: 'Модер',
    lastName: 'Модеров',
    grade: 11,
  },
  {
    username: 'helper_math',
    password: 'password123',
    roles: { helper: true },
    phone: '+77770000003',
    telegramId: '100000003',
    firstName: 'Айдос',
    lastName: 'Ерболатов',
    subjects: ['Математика', 'Физика'],
    grade: 11,
  },
  {
    username: 'helper_history',
    password: 'password123',
    roles: { helper: true },
    phone: '+77770000004',
    telegramId: '100000004',
    firstName: 'Гульмира',
    lastName: 'Аскарова',
    subjects: ['История Казахстана', 'Всемирная история'],
    grade: 10,
  },
  {
    username: 'student_amina',
    password: 'password123',
    roles: { student: true },
    phone: '+77770000005',
    telegramId: '100000005',
    firstName: 'Амина',
    lastName: 'Сапарова',
    grade: 9,
  },
  {
    username: 'student_timur',
    password: 'password123',
    roles: { student: true },
    phone: '+77770000006',
    telegramId: '100000006',
    firstName: 'Тимур',
    lastName: 'Ибраев',
    grade: 8,
  },
];

const importData = async () => {
  try {
    // 1. Очистка коллекций
    await Request.deleteMany();
    await Response.deleteMany();
    await Message.deleteMany();
    await Review.deleteMany();
    await User.deleteMany();
    console.log('Старые данные удалены.');

    // 2. Создание пользователей
    const createdUsers = await Promise.all(
      usersData.map(async (userData) => {
        const user = new User({ ...userData, hasPassword: true });
        // Хешируем пароль вручную, так как pre-save хук может не сработать в некоторых сценариях
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(userData.password, salt);
        return user.save();
      })
    );
    console.log('Пользователи созданы.');

    // 3. Распределение ролей для удобства
    const adminUser = createdUsers.find(u => u.username === 'admin');
    const studentAmina = createdUsers.find(u => u.username === 'student_amina');
    const studentTimur = createdUsers.find(u => u.username === 'student_timur');
    const helperMath = createdUsers.find(u => u.username === 'helper_math');
    const helperHistory = createdUsers.find(u => u.username === 'helper_history');

    // 4. Создание заявок
    const requestsData = [
      {
        title: 'Помогите решить задачу по тригонометрии',
        description: 'Не могу понять, как использовать формулу косинуса двойного угла в задаче №23.',
        subject: 'Математика',
        grade: 9,
        author: studentAmina._id,
        status: 'open',
      },
      {
        title: 'Нужна помощь с эссе по истории Казахстана',
        description: 'Тема: "Влияние Шелкового пути". Нужны тезисы и план.',
        subject: 'История Казахстана',
        grade: 8,
        author: studentTimur._id,
        status: 'assigned',
        helper: helperHistory._id,
      },
      {
        title: 'Закон Ома для полной цепи',
        description: 'Объясните, пожалуйста, что такое ЭДС. Завтра СОР.',
        subject: 'Физика',
        grade: 10,
        author: studentAmina._id,
        status: 'completed',
        helper: helperMath._id,
        closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 дня назад
      },
    ];
    const createdRequests = await Request.insertMany(requestsData);
    console.log('Заявки созданы.');

    // 5. Создание переписки в чате
    const assignedRequest = createdRequests.find(r => r.status === 'assigned');
    const messagesData = [
        { requestId: assignedRequest._id, sender: studentTimur._id, content: 'Здравствуйте! Спасибо, что откликнулись.' },
        { requestId: assignedRequest._id, sender: helperHistory._id, content: 'Привет! Сейчас набросаю план.' },
        { requestId: assignedRequest._id, sender: studentTimur._id, content: 'Супер, спасибо!' },
    ];
    await Message.insertMany(messagesData);
    console.log('Сообщения в чате созданы.');

    // 6. Создание отзыва
    const completedRequest = createdRequests.find(r => r.status === 'completed');
    const reviewData = {
        requestId: completedRequest._id,
        reviewerId: studentAmina._id, // Правильное поле
        helperId: helperMath._id,     // Правильное поле
        rating: 5,
        comment: 'Все отлично объяснили, спасибо!',
        isResolved: true,
    };
    await Review.create(reviewData);
    console.log('Отзыв создан.');

    console.log('База данных успешно наполнена демо-данными!');
    process.exit();
  } catch (error) {
    console.error(`Ошибка при импорте данных: ${error}`);
    process.exit(1);
  }
};

const deleteData = async () => {
  try {
    await Request.deleteMany();
    await Response.deleteMany();
    await Message.deleteMany();
    await Review.deleteMany();
    await User.deleteMany();
    console.log('Все демо-данные успешно удалены из базы данных.');
    process.exit();
  } catch (error) {
    console.error(`Ошибка при удалении данных: ${error}`);
    process.exit(1);
  }
};

// --- Запуск ---
const run = async () => {
  await connectDB();
  if (process.argv[2] === '-d') {
    await deleteData();
  } else {
    await importData();
  }
};

run(); 