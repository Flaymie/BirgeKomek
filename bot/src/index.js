require('dotenv').config();
const { Telegraf, Markup, Scenes, session } = require('telegraf');
const axios = require('axios');

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;

if (!BOT_TOKEN) {
  console.error('Ошибка: BOT_TOKEN не найден. Пожалуйста, проверьте ваш .env файл.');
  process.exit(1);
}

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


const registrationScene = new Scenes.WizardScene(
  'registration',
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
  (ctx) => {
    if (!ctx.callbackQuery?.data.startsWith('role_')) {
        ctx.reply('Пожалуйста, выберите роль, используя кнопки выше.');
        return;
    }
    const role = ctx.callbackQuery.data.split('_')[1];
    ctx.wizard.state.data.role = role;
    ctx.reply(
        'Отлично. Выберите ваш класс/статус:',
        Markup.keyboard([
            ['7 класс', '8 класс', '9 класс'],
            ['10 класс', '11 класс'],
            ['🎓 Студент', '👔 Взрослый']
        ]).resize().oneTime()
    );
    return ctx.wizard.next();
  },
  (ctx) => {
    const text = ctx.message?.text;
    let grade;
    
    // Парсим выбор пользователя
    if (text === '🎓 Студент') {
      grade = 'student';
    } else if (text === '👔 Взрослый') {
      grade = 'adult';
    } else {
      // Извлекаем число из "7 класс", "8 класс" и т.д.
      const match = text?.match(/^(\d+)/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num >= 7 && num <= 11) {
          grade = num.toString();
        }
      }
    }
    
    if (!grade) {
        ctx.reply('Пожалуйста, выберите класс/статус, используя кнопки.');
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
    
    ctx.reply('Отлично! Теперь, пожалуйста, поделитесь вашим номером телефона. Это нужно для верификации вашего аккаунта.', 
      Markup.keyboard([
        Markup.button.contactRequest('📱 Поделиться номером')
      ]).resize().oneTime()
    );
    // Для роли "student" сразу переходим на шаг получения контакта (шаг 4, индекс 4)
    return ctx.wizard.selectStep(4);
  },
  async (ctx) => {
     // Этот шаг только для хелперов (выбор предметов)
     // Для студентов мы уже перешли на шаг 4 (получение контакта) через selectStep(3)
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
        return ctx.wizard.next();
     }
     // Сообщение-подсказка оставляем только для хелперов
     if (ctx.wizard.state.data.role === 'helper') {
        ctx.reply('Пожалуйста, используйте кнопки для выбора предметов.');
     }
  },
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

const bot = new Telegraf(BOT_TOKEN);
const stage = new Scenes.Stage([registrationScene]);

bot.use(session());
bot.use(stage.middleware());

bot.start(async (ctx) => {
  const payload = ctx.startPayload;

  if (!payload) {
    const text = 
      `👋 Привет! Это официальный бот *Birge Kömek* — платформы взаимопомощи для школьников.\n\n` +
      `🛑 Чтобы пользоваться ботом, сначала зайди на наш сайт и нажми:\n` +
      `👉 *"Войти через Telegram"* или *"Зарегистрироваться через Telegram"*\n\n` +
      `После этого бот всё поймёт и продолжит с нужного места 😊`;

    const options = {
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    };

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


  const [action, token] = payload.split('_');

  if (action === 'register') {
    try {
      const response = await axios.get(`${API_URL}/api/users/by-telegram/${ctx.from.id}`);
      if (response.data.exists) {
        return ctx.reply('Вы уже зарегистрированы. Чтобы войти, вернитесь на сайт и нажмите "Войти через Telegram".');
      }
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
    ctx.session.linkData = {
        linkToken: payload,
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

bot.on('callback_query', async (ctx) => {
    const data = ctx.callbackQuery.data;

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
});

bot.on('contact', async (ctx) => {
    const { linkData } = ctx.session;
    
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
            ctx.session.linkData = null;
        }
    } else {
        ctx.reply('Спасибо, но сейчас мне не нужен ваш номер. 😊');
    }
});

async function registerUser(ctx) {
    const { role, grade, subjects, phone } = ctx.wizard.state.data;
    const { id: telegramId, username, first_name, last_name } = ctx.from;
    const { loginToken } = ctx.scene.state;

    const candidateUsername = username || `${first_name || ''}${last_name || ''}`.replace(/[^a-zA-Z0-9_]/g, '') || `user${telegramId.toString().slice(-4)}`;
    
    if (!candidateUsername) {
        await ctx.reply('Не удалось сгенерировать имя пользователя. Регистрация прервана.');
        return ctx.scene.leave();
    }

    try {
        await ctx.reply(`Проверяю данные...`);

        const checkResponse = await axios.post(`${API_URL}/api/auth/check-username`, { username: candidateUsername });
        if (!checkResponse.data.available) {
            await ctx.reply(`К сожалению, ваше имя пользователя в Telegram ('${candidateUsername}') уже занято на нашей платформе. Пожалуйста, измените его в настройках Telegram или зарегистрируйтесь на сайте, а затем привяжите аккаунт.`);
            return ctx.scene.leave();
        }
        
        const regResponse = await axios.post(`${API_URL}/api/auth/telegram/register`, {
            role,
            grade,
            subjects,
            telegramId,
            username: candidateUsername,
            firstName: first_name,
            lastName: last_name,
            phone: phone
        });

        const { userId } = regResponse.data;

        if (loginToken && userId) {
             await axios.post(`${API_URL}/api/auth/telegram/complete-login`, { 
                telegramId: telegramId,
                loginToken: loginToken,
                userId: userId
            });
            await ctx.reply('Супер! Вы успешно зарегистрированы. Теперь вернитесь на вкладку сайта, она должна обновиться автоматически.');
        } else {
             await ctx.reply('Супер! Вы успешно зарегистрированы. Теперь вы можете войти на сайт, используя свое имя пользователя.');
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

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM')); 