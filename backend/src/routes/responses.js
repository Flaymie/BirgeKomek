import express from 'express';
import { body, param, validationResult } from 'express-validator';
import Response from '../models/Response.js';
import Request from '../models/Request.js';
import { protect } from '../middleware/auth.js';
import { createAndSendNotification } from './notifications.js';
import { generalLimiter } from '../middleware/rateLimiters.js';
import tgRequired from '../middleware/tgRequired.js';

export default ({ io }) => {
  const router = express.Router();

  // Применяем `protect` и `generalLimiter` ко всем роутам в этом файле
  router.use(protect, generalLimiter);

  /**
   * @swagger
   * tags:
   *   name: Responses
   *   description: Управление откликами на запросы помощи
   */

  /**
   * @swagger
   * /api/responses:
   *   post:
   *     summary: Создать отклик на запрос
   *     tags: [Responses]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               requestId:
   *                 type: string
   *               message:
   *                 type: string
   *     responses:
   *       201:
   *         description: Отклик успешно создан
   *       400:
   *         description: Ошибка валидации
   *       403:
   *         description: Недостаточно прав
   *       500:
   *         description: Ошибка сервера
   */
  router.post('/', [
    body('requestId').isMongoId().withMessage('Некорректный ID запроса'),
    body('message')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Сообщение должно быть от 10 до 500 символов'),
    tgRequired
  ], async (req, res) => {
    console.log('Получен POST запрос на /api/responses:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Ошибки валидации:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { requestId, message } = req.body;
      const helper = req.user._id;

      console.log('Данные отклика:', { requestId, message, helper });
      
      // Проверяем существование запроса
      const request = await Request.findById(requestId);
      if (!request) {
        return res.status(404).json({ msg: 'Запрос не найден' });
      }

      // Проверяем, что текущий пользователь - хелпер
      if (!req.user.roles.helper) {
        return res.status(403).json({ msg: 'Только хелперы могут откликаться' });
      }

      // Проверяем, что хелпер еще не откликался на этот запрос
      const existingResponse = await Response.findOne({ 
        request: requestId, 
        helper: helper 
      });

      if (existingResponse) {
        return res.status(400).json({ msg: 'Вы уже откликались на этот запрос' });
      }

      // Создаем новый отклик
      const newResponse = new Response({
        request: requestId,
        helper: helper,
        message: message,
        status: 'pending'
      });

      await newResponse.save();

      const populatedResponse = await Response.findById(newResponse._id)
                                            .populate('helper', 'username avatar');
      
      // Отправляем сокет автору заявки
      if(request.author) {
        io.to(request.author.toString()).emit('new_response', populatedResponse);
      }

      // Создаем уведомление для автора запроса
      await createAndSendNotification(req.app.locals.sseConnections, {
        user: request.author,
        type: 'request_taken_by_helper',
        title: 'Новый отклик на вашу заявку!',
        message: `Пользователь ${req.user.username} откликнулся на вашу заявку "${request.title}".`,
        link: `/request/${request._id}`,
        relatedEntity: {
          requestId: request._id,
          responseId: newResponse._id,
          userId: helper
        }
      });

      res.status(201).json(populatedResponse);
    } catch (error) {
      console.error('Ошибка при создании отклика:', error);
      res.status(500).json({ msg: 'Ошибка сервера при создании отклика' });
    }
  });

  /**
   * @swagger
   * /api/responses/{requestId}:
   *   get:
   *     summary: Получить все отклики для конкретного запроса
   *     tags: [Responses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: requestId
   *         required: true
   *         schema:
   *           type: string
   *     responses:
   *       200:
   *         description: Список откликов
   *       403:
   *         description: Недостаточно прав
   *       500:
   *         description: Ошибка сервера
   */
  router.get('/:requestId', async (req, res) => {
    try {
      const { requestId } = req.params;

      // Проверяем существование и права доступа к запросу
      const request = await Request.findById(requestId);
      if (!request) {
        return res.status(404).json({ msg: 'Запрос не найден' });
      }

      // Проверяем, что пользователь либо автор запроса, либо хелпер
      if (request.author.toString() !== req.user._id.toString() && 
          !req.user.roles.helper) {
        return res.status(403).json({ msg: 'Недостаточно прав' });
      }

      const responses = await Response.find({ request: requestId })
        .populate('helper', 'username avatar');

      res.json(responses);
    } catch (error) {
      console.error('Ошибка при получении откликов:', error);
      res.status(500).json({ msg: 'Ошибка сервера при получении откликов' });
    }
  });

  /**
   * @swagger
   * /api/responses/{responseId}/status:
   *   put:
   *     summary: Обновить статус отклика
   *     tags: [Responses]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: responseId
   *         required: true
   *         schema:
   *           type: string
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               status:
   *                 type: string
   *                 enum: ['accepted', 'rejected']
   *     responses:
   *       200:
   *         description: Статус отклика обновлен
   *       400:
   *         description: Некорректный статус
   *       403:
   *         description: Недостаточно прав
   *       500:
   *         description: Ошибка сервера
   */
  router.put('/:responseId/status', [
    param('responseId').isMongoId().withMessage('Некорректный ID отклика'),
    body('status')
      .isIn(['accepted', 'rejected'])
      .withMessage('Некорректный статус')
  ], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { responseId } = req.params;
      const { status } = req.body;

      const response = await Response.findById(responseId)
        .populate('request')
        .populate('helper');

      if (!response) {
        return res.status(404).json({ msg: 'Отклик не найден' });
      }

      // Проверяем, что текущий пользователь - автор запроса
      if (response.request.author.toString() !== req.user._id.toString()) {
        return res.status(403).json({ msg: 'Недостаточно прав' });
      }

      response.status = status;
      await response.save();

      // Отправляем сокет хелперу об обновлении статуса его отклика
      if (response.helper) {
          io.to(response.helper._id.toString()).emit('response_updated', response);
      }

      // Если отклик принят, обновляем статус запроса и назначаем хелпера
      if (status === 'accepted') {
        const request = await Request.findById(response.request._id);
        if (request) {
          request.status = 'in_progress';
          request.helper = response.helper._id;
          await request.save();
          
          console.log(`Запрос ${request._id} обновлен: статус изменен на in_progress, назначен хелпер ${response.helper._id}`);
          
          // Уведомление хелперу, что его отклик приняли
          await createAndSendNotification(req.app.locals.sseConnections, {
              user: response.helper._id,
              type: 'response_accepted',
              title: 'Ваш отклик приняли!',
              message: `Ваш отклик на заявку "${request.title}" был принят. Можете приступать к помощи.`,
              link: `/requests/${request._id}/chat`,
              relatedEntity: { requestId: request._id }
          });

          // Отклоняем все остальные отклики на этот запрос
          await Response.updateMany(
            { request: request._id, _id: { $ne: responseId } },
            { $set: { status: 'rejected' } }
          );
        }
      } else if (status === 'rejected') {
          // Уведомление хелперу, что его отклик отклонили
          await createAndSendNotification(req.app.locals.sseConnections, {
              user: response.helper._id,
              type: 'response_rejected',
              title: 'Ваш отклик отклонен',
              message: `К сожалению, ваш отклик на заявку "${response.request.title}" был отклонен.`,
              link: `/request/${response.request._id}`,
              relatedEntity: { requestId: response.request._id }
          });
      }

      res.json(response);
    } catch (error) {
      console.error('Ошибка при обновлении статуса отклика:', error);
      res.status(500).json({ msg: 'Ошибка сервера при обновлении статуса' });
    }
  });

  return router;
}; 