import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PeerHelp API',
      version: '1.0.0',
      description: 'API для платформы взаимопомощи между школьниками',
      contact: {
        name: 'flaymie',
      },
    },
    servers: [
      {
        url: 'http://localhost:5050',
        description: 'Локальный сервер разработки',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            username: {
              type: 'string',
              example: 'petya2005'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'petya@example.com'
            },
            phone: {
              type: 'string',
              example: '+77001234567'
            },
            roles: {
              type: 'object',
              properties: {
                student: {
                  type: 'boolean',
                  example: true
                },
                helper: {
                  type: 'boolean',
                  example: true
                }
              }
            },
            grade: {
              type: 'integer',
              example: 9
            },
            points: {
              type: 'integer',
              example: 125
            },
            rating: {
              type: 'number',
              format: 'float',
              example: 4.8
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Request: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            title: {
              type: 'string',
              example: 'Помогите с теоремой Пифагора'
            },
            description: {
              type: 'string',
              example: 'Не понимаю, как применить теорему Пифагора для решения этой задачи...'
            },
            subject: {
              type: 'string',
              example: 'Математика'
            },
            grade: {
              type: 'integer',
              example: 8
            },
            topic: {
              type: 'string',
              example: 'Геометрия'
            },
            format: {
              type: 'string',
              enum: ['text', 'call', 'chat', 'meet'],
              example: 'chat'
            },
            time: {
              type: 'object',
              properties: {
                start: {
                  type: 'string',
                  format: 'date-time'
                },
                end: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            },
            author: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            helper: {
              type: 'string',
              example: '60d21b4967d0d8992e610c86'
            },
            status: {
              type: 'string',
              enum: ['open', 'assigned', 'completed', 'cancelled'],
              example: 'open'
            },
            isUrgent: {
              type: 'boolean',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Message: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            requestId: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            sender: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            content: {
              type: 'string',
              example: 'Привет! Я готов помочь с задачей.'
            },
            attachments: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['https://example.com/file.pdf']
            },
            readBy: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['60d21b4967d0d8992e610c85']
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Review: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            requestId: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            reviewerId: {
              type: 'string',
              example: '60d21b4967d0d8992e610c85'
            },
            helperId: {
              type: 'string',
              example: '60d21b4967d0d8992e610c86'
            },
            rating: {
              type: 'integer',
              minimum: 1,
              maximum: 5,
              example: 5
            },
            comment: {
              type: 'string',
              example: 'Очень хорошо объяснил, все понятно!'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Auth',
        description: 'Регистрация и авторизация',
      },
      {
        name: 'Requests',
        description: 'Управление заявками на помощь',
      },
      {
        name: 'Messages',
        description: 'Сообщения и чат между пользователями',
      },
      {
        name: 'Reviews',
        description: 'Отзывы и рейтинги помощников',
      },
      {
        name: 'Users',
        description: 'Управление профилями пользователей',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // пути до файлов с маршрутами
};

const specs = swaggerJsdoc(options);

export default specs; 