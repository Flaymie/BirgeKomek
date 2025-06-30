require('dotenv').config();
const { Telegraf, Markup, Scenes, session } = require('telegraf');
const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
import { getIO } from './utils/socket.js';
import User from './models/User.js';
import Request from './models/Request.js';
import Message from './models/Message.js';
import Notification from './models/Notification.js';
const redis = require('../config/redis_telegraf'); // Нужен редис для Telegraf
const { getIo, findSocketByUserId } = require('../utils/socketManager'); // Правильный импорт сокетов

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!BOT_TOKEN) {
  console.error('Ошибка: BOT_TOKEN не найден. Пожалуйста, проверьте ваш .env файл.');
  process.exit(1);
}

// --- Хелпер для создания клавиатуры ---
function createSubjectsKeyboard(selectedSubjects = []) {
    const getButton = (value, label) => {
        const isSelected = selectedSubjects.includes(value);
        const text = `${isSelected ? '✅ ' : ''}${label}`;
        return Markup.button.callback(text, `subject_${value}`);
    };

    return Markup.inlineKeyboard([
        [getButton('Математика', 'Математика'), getButton('Физика', 'Физика')],
        [getButton('Химия', 'Химия'), getButton('Биология', 'Биология')],
        [getButton('История', 'История'), getButton('География', 'География')],
        [getButton('Русский язык', 'Русский язык'), getButton('Английский язык', 'Английский язык')],
        [getButton('Информатика', 'Информатика'), getButton('Другое', 'Другое')],
        [Markup.button.callback('🚀 Готово', 'subjects_done')]
    ]);
}

// --- Сценарий регистрации ---

const registrationScene = new Scenes.WizardScene(
  'registration',
  // Step 1: Ask for role
  (ctx) => {
    ctx.reply(
      'Добро пожаловать в регистрацию! Кем вы хотите быть на платформе?',
      Markup.inlineKeyboard([
        Markup.button.callback('Я Ученик', 'role_student'),
        Markup.button.callback('Я Хелпер', 'role_helper'),
      ])
    );
    ctx.wizard.state.data = {};
    return ctx.wizard.next();
  },
  // Step 2: Ask for email
  (ctx) => {
    if (!ctx.callbackQuery?.data.startsWith('role_')) {
        ctx.reply('Пожалуйста, выберите роль, используя кнопки выше.');
        return;
    }
    const role = ctx.callbackQuery.data.split('_')[1];
    ctx.wizard.state.data.role = role;
    ctx.reply('Отлично! Теперь введите ваш email-адрес. Он будет использоваться для входа на сайт.');
    return ctx.wizard.next();
  },
  // Step 3: Ask for grade
  (ctx) => {
    const email = ctx.message?.text;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.reply('Это не похоже на email. Попробуйте еще раз.');
        return;
    }
    ctx.wizard.state.data.email = email;
    ctx.reply(
        'Принято. В каком классе вы учитесь? (для хелперов это поможет лучше подбирать запросы)',
        Markup.keyboard([
            ['7', '8', '9'],
            ['10', '11']
        ]).resize().oneTime()
    );
    return ctx.wizard.next();
  },
  // Step 4: Ask for subjects (for helpers) or finalize
  (ctx) => {
    const grade = parseInt(ctx.message?.text, 10);
    if (isNaN(grade) || grade < 7 || grade > 11) {
        ctx.reply('Пожалуйста, выберите класс от 7 до 11, используя кнопки.');
        return;
    }
    ctx.wizard.state.data.grade = grade;

    if (ctx.wizard.state.data.role === 'helper') {
        ctx.wizard.state.data.subjects = [];
        ctx.reply('Теперь выберите предметы, по которым вы можете помогать. Можно выбрать несколько.',
            createSubjectsKeyboard([])
        );
        return ctx.wizard.next();
    }
    
    // Студенты сразу переходят к запросу номера
    ctx.reply('Отлично! Теперь, пожалуйста, поделитесь вашим номером телефона. Это нужно для верификации вашего аккаунта.', 
      Markup.keyboard([
        Markup.button.contactRequest('📱 Поделиться номером')
      ]).resize().oneTime()
    );
    // Для студентов это будет шаг 5, поэтому мы пропускаем шаг 4 (выбор предметов)
    return ctx.wizard.selectStep(ctx.wizard.cursor + 2);
  },
  // Step 5 (для хелперов): обработка выбора предметов
  async (ctx) => {
     if (ctx.callbackQuery?.data.startsWith('subject_')) {
        const subject = ctx.callbackQuery.data.split('_')[1];
        const subjects = ctx.wizard.state.data.subjects;

        if (subjects.includes(subject)) {
            ctx.wizard.state.data.subjects = subjects.filter(s => s !== subject);
        } else {
            ctx.wizard.state.data.subjects.push(subject);
        }
        
        const updatedKeyboard = createSubjectsKeyboard(ctx.wizard.state.data.subjects);
        await ctx.editMessageReplyMarkup(updatedKeyboard.reply_markup);
        await ctx.answerCbQuery();
        return;
     }

     if (ctx.callbackQuery?.data === 'subjects_done') {
        if (ctx.wizard.state.data.subjects.length === 0) {
            await ctx.answerCbQuery('Выберите хотя бы один предмет!', { show_alert: true });
            return;
        }
        await ctx.editMessageText('Отлично! Теперь, пожалуйста, поделитесь вашим номером телефона. Это нужно для верификации вашего аккаунта.');
        await ctx.reply('Нажмите на кнопку ниже:', Markup.keyboard([
            Markup.button.contactRequest('📱 Поделиться номером')
        ]).resize().oneTime());
        return ctx.wizard.next(); // Переходим к шагу получения контакта
     }
     // Если пришло не то, что мы ожидали
     ctx.reply('Пожалуйста, используйте кнопки для выбора предметов.');
  },
  // Step 6 (финальный): получение контакта и регистрация
  (ctx) => {
    if (!ctx.message?.contact?.phone_number) {
        ctx.reply('Пожалуйста, используйте кнопку, чтобы поделиться вашим номером.');
        return;
    }
    ctx.wizard.state.data.phone = ctx.message.contact.phone_number;
    ctx.reply('Регистрация почти завершена...', Markup.removeKeyboard());
    return registerUser(ctx);
  }
);

// --- Bot Setup ---
const bot = new Telegraf(BOT_TOKEN);
const stage = new Scenes.Stage([registrationScene]);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  const payload = ctx.startPayload;

  if (!payload) {
    // Пользователь просто нашел бота и нажал /start
    const text = 
      `👋 Привет! Это официальный бот *Birge Kömek* — платформы взаимопомощи для школьников.\n\n` +
      `🛑 Чтобы пользоваться ботом, сначала зайди на наш сайт и нажми:\n` +
      `👉 *"Войти через Telegram"* или *"Зарегистрироваться через Telegram"*\n\n` +
      `После этого бот всё поймёт и продолжит с нужного места 😊`;

    const options = {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };

    // Telegram не позволяет использовать localhost в кнопках.
    // Поэтому в режиме разработки отправляем ссылку текстом, а не кнопкой.
    if (process.env.FRONTEND_URL && process.env.FRONTEND_URL.includes('localhost')) {
      return ctx.reply(`${text}\n\n🔗 *Ссылка для разработки:* ${process.env.FRONTEND_URL}`, options);
    }

    return ctx.reply(text, {
      ...options,
      ...Markup.inlineKeyboard([
        Markup.button.url('🔗 Перейти на сайт', process.env.FRONTEND_URL)
      ])
    });
  }

  // --- Пользователь пришел с сайта с payload'ом ---

  const [action, token] = payload.split('_');

  if (action === 'register') {
    try {
      // ИСПОЛЬЗУЕМ НОВЫЙ ПРАВИЛЬНЫЙ РОУТ
      const response = await axios.get(`${API_URL}/api/users/by-telegram/${ctx.from.id}`);
      if (response.data.exists) {
        return ctx.reply('Вы уже зарегистрированы. Чтобы войти, вернитесь на сайт и нажмите "Войти через Telegram".');
      }
      // Передаем токен в сцену, чтобы потом привязать пользователя
      ctx.scene.enter('registration', { loginToken: token });
    } catch (error) {
      console.error("Ошибка при проверке пользователя для регистрации:", error.response?.data || error.message);
      return ctx.reply('Упс! Что-то пошло не так с нашим сервером. Попробуйте позже.');
    }
    return;
  }

  if (action === 'login') {
    if (!token) {
      return ctx.reply('Некорректная ссылка для входа. Пожалуйста, попробуйте снова с сайта.');
    }
    try {
      // Этот эндпоинт свяжет сессию на сайте (по токену) с telegramId
      await axios.post(`${API_URL}/api/auth/telegram/complete-login`, { 
        telegramId: ctx.from.id,
        loginToken: token 
      });
      await ctx.reply('✅ Вход подтвержден! Теперь вернитесь на сайт, сессия должна была обновиться автоматически.');
    } catch (error) {
      console.error("Ошибка при подтверждении входа:", error.response?.data || error.message);
      await ctx.reply('Упс! Не удалось войти. Возможно, ссылка устарела или недействительна. Попробуйте снова с сайта.');
    }
    return;
  }

  if (action === 'link') {
    if (!token) {
        return ctx.reply('Некорректная ссылка для привязки. Пожалуйста, попробуйте снова со страницы профиля.');
    }
    // Сохраняем данные в сессию и запрашиваем номер
    ctx.session.linkData = {
        linkToken: payload, // payload это "link_..."
        telegramId: ctx.from.id,
        telegramUsername: ctx.from.username
    };
    return ctx.reply('Для завершения привязки, пожалуйста, поделитесь вашим номером телефона. Это необходимо для безопасности вашего аккаунта.', 
        Markup.keyboard([
            Markup.button.contactRequest('📱 Поделиться номером для привязки')
        ]).resize().oneTime()
    );
  }
  
  return ctx.reply('Неизвестная команда. Пожалуйста, начните с нашего сайта.');
});

// Команда /settings для управления настройками
bot.command('settings', async (ctx) => {
  try {
    const telegramId = ctx.from.id;
    // ИСПРАВЛЕННЫЙ РОУТ
    const response = await axios.get(`${API_URL}/api/users/by-telegram/${telegramId}/settings`);
    const { telegramNotificationsEnabled } = response.data;

    const statusText = telegramNotificationsEnabled ? '✅ Включены' : '❌ Отключены';
    const buttonText = telegramNotificationsEnabled ? 'Выключить' : 'Включить';
    const buttonEmoji = telegramNotificationsEnabled ? '🔴' : '🟢';

    await ctx.reply(`Настройки ваших уведомлений в Telegram:\n\n*Статус:* ${statusText}`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[
          { text: `${buttonEmoji} ${buttonText}`, callback_data: 'toggle_notifications' }
        ]]
      }
    });
  } catch (error) {
    console.error('Ошибка при получении настроек:', error.response?.data || error.message);
    await ctx.reply('Не удалось загрузить ваши настройки. Попробуйте позже.');
  }
});

// Обработчик для колбэков от инлайн-кнопок
bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat.id;
    const messageId = ctx.callbackQuery.message.message_id;

    // --- ЛОГИКА ДЛЯ ПОДТВЕРЖДЕНИЯ ДЕЙСТВИЙ МОДЕРАТОРА ---
    if (data.startsWith('confirm_action:') || data.startsWith('deny_action:')) {
        const [type, token] = data.split(':');

        try {
            const actionDetailsJSON = await redis.get(`moderator_action:${token}`);
            if (!actionDetailsJSON) {
                await ctx.editMessageText('Это действие истекло или уже было выполнено.', {
                    chat_id: chatId,
                    message_id: messageId,
                });
                return ctx.answerCbQuery();
            }

            await redis.del(`moderator_action:${token}`); // Удаляем сразу
            
            const actionDetails = JSON.parse(actionDetailsJSON);
            const { action, moderatorId, targetUserId, reason, duration } = actionDetails;
            
            const io = getIo();

            if (type === 'deny_action') {
                await ctx.editMessageText('Действие отменено.', {
                    chat_id: chatId,
                    message_id: messageId
                });
                const moderatorSocket = findSocketByUserId(moderatorId);
                if (moderatorSocket) {
                    io.to(moderatorSocket.id).emit('moderator_action_failed', { message: 'Действие было отклонено в Telegram.' });
                }
                return ctx.answerCbQuery('Действие отменено');
            }

            // Если type === 'confirm_action'
            if (action === 'ban_user') {
                // Выполняем POST-запрос на основной бэкенд для бана
                // Это лучше, чем дублировать логику моделей прямо в боте
                await axios.post(`${API_URL}/api/users/${targetUserId}/ban`, {
                    reason,
                    duration
                }, { 
                    // Добавляем некий "внутренний" ключ, чтобы не любой мог дернуть этот эндпоинт
                    headers: { 'X-Internal-Bot-Key': process.env.INTERNAL_BOT_KEY }
                });
                
                // Получаем обновленные данные юзера, чтобы достать имя
                const userResponse = await axios.get(`${API_URL}/api/users/id/${targetUserId}`, {
                    headers: { 'X-Internal-Bot-Key': process.env.INTERNAL_BOT_KEY }
                });
                const targetUsername = userResponse.data.username;
                
                const successText = `Пользователь *${targetUsername}* успешно забанен.`;
                await ctx.editMessageText(successText, {
                    parse_mode: 'Markdown',
                });
                
                const moderatorSocket = findSocketByUserId(moderatorId);
                if (moderatorSocket) {
                    io.to(moderatorSocket.id).emit('moderator_action_confirmed', { message: `Пользователь ${targetUsername} забанен.` });
                }
            }

            return ctx.answerCbQuery('Действие подтверждено!');

        } catch (error) {
            console.error('Ошибка при обработке callback_query модератора:', error.response?.data || error.message);
            await ctx.reply('Произошла ошибка при выполнении действия.');
            const moderatorSocket = findSocketByUserId(JSON.parse(await redis.get(`moderator_action:${token}`)).moderatorId);
            if(moderatorSocket) {
                getIo().to(moderatorSocket.id).emit('moderator_action_failed', { message: 'Произошла внутренняя ошибка на стороне бота.' });
            }
            return ctx.answerCbQuery('Ошибка!', { show_alert: true });
        }
    }

    // --- СУЩЕСТВУЮЩАЯ ЛОГИКА ДЛЯ НАСТРОЕК УВЕДОМЛЕНИЙ ---
    if (data === 'toggle_notifications') {
        try {
            const telegramId = ctx.from.id;
            const response = await axios.post(`${API_URL}/api/users/by-telegram/${telegramId}/toggle-notifications`);
            const { telegramNotificationsEnabled } = response.data;
             
            const statusText = telegramNotificationsEnabled ? '✅ Включены' : '❌ Отключены';
            const buttonText = telegramNotificationsEnabled ? 'Выключить' : 'Включить';
            const buttonEmoji = telegramNotificationsEnabled ? '🔴' : '🟢';

            await ctx.editMessageText(`Настройки ваших уведомлений в Telegram:\n\n*Статус:* ${statusText}`, {
                 parse_mode: 'Markdown',
                 reply_markup: {
                     inline_keyboard: [[
                         { text: `${buttonEmoji} ${buttonText}`, callback_data: 'toggle_notifications' }
                     ]]
                 }
            });
            await ctx.answerCbQuery(telegramNotificationsEnabled ? 'Уведомления включены!' : 'Уведомления выключены.');
        } catch (error) {
            console.error('Ошибка при переключении настроек:', error.response?.data || error.message);
            await ctx.answerCbQuery('Не удалось изменить настройки. Попробуйте позже.', { show_alert: true });
        }
    }

    // --- Логика для регистрации ---
    if (data.startsWith('role_') || data.startsWith('subject_') || data === 'subjects_done') {
        // Эта логика обрабатывается внутри сцены, но Telegraf всё равно сначала прогоняет её здесь.
        // Не добавляем ctx.answerCbQuery(), чтобы сцена могла его обработать.
        return; 
    }
    
    // По дефолту отвечаем на колбэк, чтобы убрать "часики"
    // return ctx.answerCbQuery();
});

// --- ОБРАБОТЧИК ПОЛУЧЕНИЯ КОНТАКТА ДЛЯ ПРИВЯЗКИ ---
bot.on('contact', async (ctx) => {
    const { linkData } = ctx.session;
    
    // Проверяем, что это ответ на запрос привязки
    if (linkData && linkData.linkToken) {
        const phone = ctx.message.contact.phone_number;
        
        try {
            await axios.post(`${API_URL}/api/auth/finalizelink`, {
                ...linkData,
                phone: phone
            });
            await ctx.reply('✅ Отлично! Ваш Telegram-аккаунт успешно привязан к профилю на сайте.', Markup.removeKeyboard());
        } catch (error) {
            console.error("Ошибка при привязке аккаунта:", error.response?.data || error.message);
            const errorMessage = error.response?.data?.msg || 'Не удалось привязать аккаунт. Попробуйте снова.';
            await ctx.reply(`❌ Ошибка: ${errorMessage}`, Markup.removeKeyboard());
        } finally {
            // Очищаем сессию
            ctx.session.linkData = null;
        }
    } else {
        // Если контакт пришел вне сценария привязки
        ctx.reply('Спасибо, но сейчас мне не нужен ваш номер. 😊');
    }
});

async function registerUser(ctx) {
    const { email, role, grade, subjects, phone } = ctx.wizard.state.data;
    const { id: telegramId, username, first_name, last_name } = ctx.from;
    const { loginToken } = ctx.scene.state; // Получаем токен из состояния сцены

    // Создаем резервное имя пользователя, если у юзера в телеграме его нет
    const candidateUsername = username || `${first_name || ''}${last_name || ''}`.replace(/[^a-zA-Z0-9_]/g, '') || `user${telegramId.toString().slice(-4)}`;
    
    if (!candidateUsername) {
        await ctx.reply('Не удалось сгенерировать имя пользователя. Регистрация прервана.');
        return ctx.scene.leave();
    }

    try {
        await ctx.reply(`Проверяю данные...`);

        // 1. Проверяем, доступно ли имя пользователя
        const checkResponse = await axios.post(`${API_URL}/api/auth/check-username`, { username: candidateUsername });
        if (!checkResponse.data.available) {
            // TODO: В будущем можно попросить пользователя ввести другое имя
            await ctx.reply(`К сожалению, ваше имя пользователя в Telegram ('${candidateUsername}') уже занято на нашей платформе. Пожалуйста, измените его в настройках Telegram или зарегистрируйтесь на сайте, а затем привяжите аккаунт.`);
            return ctx.scene.leave();
        }
        
        // 2. Отправляем данные на бэкенд для создания пользователя
        const regResponse = await axios.post(`${API_URL}/api/auth/telegram/register`, {
            email,
            role,
            grade,
            subjects,
            telegramId,
            username: candidateUsername,
            firstName: first_name,
            lastName: last_name,
            phone: phone
        });

        const { userId } = regResponse.data; // Получаем ID нового юзера

        // 3. После успешной регистрации привязываем сессию на сайте
        if (loginToken && userId) {
             await axios.post(`${API_URL}/api/auth/telegram/complete-login`, { 
                telegramId: telegramId,
                loginToken: loginToken,
                userId: userId // <-- Отправляем ID нового юзера
            });
            await ctx.reply('Супер! Вы успешно зарегистрированы. Теперь вернитесь на вкладку сайта, она должна обновиться автоматически.');
        } else {
             await ctx.reply('Супер! Вы успешно зарегистрированы. Теперь вы можете войти на сайт, используя свой email.');
        }

    } catch (error) {
        console.error("Ошибка при регистрации:", error.response?.data || error.message);
        const errorMessage = error.response?.data?.msg || 'Произошла неизвестная ошибка при регистрации.';
        await ctx.reply(`Ой, ошибка! ${errorMessage}. Попробуйте начать заново с команды /start`);
    }

    return ctx.scene.leave();
}

bot.launch().then(() => {
    console.log('Телеграм-бот успешно запущен');
}).catch(err => {
    console.error('Ошибка при запуске бота:', err);
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Мне нужна функция для поиска сокета по ID юзера
// Я предполагаю, что она может быть в `utils/socket.js`, но если ее там нет - нужно создать
function findSocketByUserId(userId) {
  const io = getIO();
  if (!io || !io.sockets.sockets) return null;

  for (const [id, socket] of io.sockets.sockets) {
    if (socket.userId === userId) {
      return socket;
    }
  }
  return null;
} 