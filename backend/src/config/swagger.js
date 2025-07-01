import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Бірге Көмек API',
      version: '1.0.0',
      description: 'Документация API для платформы взаимопомощи школьников Бірге Көмек',
    },
    servers: [
      {
        url: process.env.REACT_APP_API_URL, // Адрес вашего сервера
        description: 'Адрес вашего сервера'
      },
      // Можно добавить другие серверы (например, для продакшена)
    ],
    components: {
      securitySchemes: {
        bearerAuth: { // Имя схемы безопасности
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', // Указываем формат токена
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60d21b4667d0d8992e610c84' },
            username: { type: 'string', example: 'testuser' },
            phone: { type: 'string', example: '+77001234567' },
            roles: {
              type: 'object',
              properties: {
                student: { type: 'boolean', example: true },
                helper: { type: 'boolean', example: false },
              },
            },
            grade: { type: 'integer', example: 9 },
            points: { type: 'integer', example: 150 },
            rating: { type: 'number', format: 'float', example: 4.5 },
            reviews: {
              type: 'array',
              items: {
                type: 'string', // ID отзывов
                example: '60d21b4967d0d8992e610c85'
              }
            },
            helperSubjects: { 
              type: 'array',
              items: { 
                type: 'string',
                example: 'Математика' 
              },
              description: 'Предметы, по которым пользователь может помогать'
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Request: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            subject: { type: 'string' },
            grade: { type: 'integer' },
            topic: { type: 'string' },
            format: { type: 'string', enum: ['text', 'call', 'chat', 'meet'] },
            time: {
              type: 'object',
              properties: {
                start: { type: 'string', format: 'date-time' },
                end: { type: 'string', format: 'date-time' },
              },
            },
            author: { $ref: '#/components/schemas/User' }, // Ссылка на схему User
            helper: { $ref: '#/components/schemas/User' }, // Ссылка на схему User
            status: { type: 'string', enum: ['open', 'assigned', 'completed', 'cancelled'] },
            isUrgent: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Message: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            requestId: { type: 'string' }, // ID заявки
            sender: { $ref: '#/components/schemas/User' }, // Ссылка на схему User
            content: { type: 'string' },
            attachments: { type: 'array', items: { type: 'string' } },
            readBy: { type: 'array', items: { type: 'string' } }, // Массив ID пользователей, прочитавших сообщение
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            requestId: { type: 'string' }, // ID заявки
            reviewerId: { $ref: '#/components/schemas/User' }, // Ссылка на схему User (кто оставил отзыв)
            helperId: { $ref: '#/components/schemas/User' }, // Ссылка на схему User (о ком отзыв)
            rating: { type: 'integer', minimum: 1, maximum: 5 },
            comment: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: { // Новая схема для уведомлений
          type: 'object',
          properties: {
            _id: { type: 'string', example: '60f123abc123def456abc789' },
            user: { type: 'string', description: 'ID пользователя, которому адресовано уведомление', example: '60d21b4667d0d8992e610c84' },
            type: {
              type: 'string',
              enum: ['new_request_for_subject', 'request_assigned_to_you', 'request_taken_by_helper', 'new_message_in_request', 'request_marked_completed', 'new_review_for_you', 'request_status_changed'],
              description: 'Тип уведомления',
              example: 'new_message_in_request'
            },
            title: { type: 'string', description: 'Заголовок уведомления', example: 'Новое сообщение в заявке "Помощь по алгебре"' },
            message: { type: 'string', description: 'Детальное сообщение (опционально)', example: 'Пользователь @helper123 ответил вам.' },
            link: { type: 'string', description: 'Ссылка для перехода (например, на заявку)', example: '/requests/60f123456abcdef123456789' },
            isRead: { type: 'boolean', description: 'Статус прочтения', default: false },
            relatedEntity: {
              type: 'object',
              properties: {
                requestId: { type: 'string', example: '60f123456abcdef123456789' },
                userId: { type: 'string', example: '60d21b4667d0d8992e610c84' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          }
        }
      },
    },
    tags: [
      { name: 'Auth', description: 'Аутентификация пользователей' },
      { name: 'Users', description: 'Управление профилями пользователей' },
      { name: 'Requests', description: 'Управление заявками на помощь' },
      { name: 'Messages', description: 'Обмен сообщениями в рамках заявок' },
      { name: 'Reviews', description: 'Отзывы и рейтинг пользователей' },
      { name: 'Notifications', description: 'Управление уведомлениями пользователей' },
      { name: 'Statistics', description: 'Статистика и аналитика по платформе' },
    ],
  },
  apis: ['./src/routes/*.js'], // Указываем путь к файлам с JSDoc аннотациями
};

const swaggerSpecs = swaggerJsdoc(options);

export default swaggerSpecs; 