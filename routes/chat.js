const express = require('express')
const router = express.Router()
const { Chat, Message, User, Item } = require('../models')
const { isLoggedIn } = require('./middlewares')
const { Op } = require('sequelize')

/**
 * @swagger
 * /api/chat:
 *   get:
 *     summary: 내 채팅방 목록 조회
 *     description: 로그인한 사용자의 채팅방 목록을 조회합니다. 각 채팅방에는 최근 메시지 1개와 참여자 정보가 포함됩니다.
 *     tags:
 *       - Chat
 *     responses:
 *       200:
 *         description: 채팅 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 chats:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       item:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 101
 *                           name:
 *                             type: string
 *                             example: "아이템 이름"
 *                       participants:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 5
 *                             name:
 *                               type: string
 *                               example: "홍길동"
 *                             nick:
 *                               type: string
 *                               example: "gildong"
 *                       messages:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 1001
 *                             content:
 *                               type: string
 *                               example: "최근 메시지 내용"
 *                             createdAt:
 *                               type: string
 *                               format: date-time
 *                               example: "2025-08-18T12:34:56.789Z"
 *       401:
 *         description: 인증되지 않은 사용자
 *       500:
 *         description: 채팅 목록 조회 중 오류 발생
 */
router.get('/', isLoggedIn, async (req, res, next) => {
   try {
      const userId = req.user.id

      const chats = await Chat.findAll({
         where: { [Op.or]: [{ buyerId: userId }, { sellerId: userId }] },
         include: [
            { model: Item, as: 'item' },
            {
               model: Message,
               as: 'messages',
               limit: 1,
               order: [['createdAt', 'DESC']],
               separate: true,
            },
            { model: User, as: 'buyer', attributes: ['id', 'name', 'nick'] },
            { model: User, as: 'seller', attributes: ['id', 'name', 'nick'] },
         ],
         order: [['updatedAt', 'DESC']],
      })

      const result = chats.map((chat) => ({
         ...chat.toJSON(),
         participants: [chat.buyer && { id: chat.buyer.id, name: chat.buyer.name, nick: chat.buyer.nick }, chat.seller && { id: chat.seller.id, name: chat.seller.name, nick: chat.seller.nick }].filter(Boolean),
         messages: chat.messages || [],
      }))

      res.json({ success: true, chats: result })
   } catch (error) {
      error.status = 500
      error.message = '채팅 목록 조회 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /api/chat/create:
 *   post:
 *     summary: 채팅방 조회 또는 생성
 *     description: 특정 상품과 참여자(buyer, seller)에 대한 채팅방을 조회하고, 없으면 새로 생성합니다.
 *                  조회된 채팅방에는 최근 메시지 1개와 참여자 정보가 포함됩니다.
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - buyerId
 *               - sellerId
 *             properties:
 *               itemId:
 *                 type: integer
 *               buyerId:
 *                 type: integer
 *               sellerId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 채팅방 조회 또는 생성 성공
 *       400:
 *         description: 필수 값 누락
 *       401:
 *         description: 인증되지 않은 사용자
 *       500:
 *         description: 채팅방 조회/생성 중 오류 발생
 */
router.post('/create', isLoggedIn, async (req, res, next) => {
   try {
      const { itemId, buyerId, sellerId } = req.body

      if (!sellerId || !buyerId) {
         return res.status(400).json({ success: false, message: '필수 값이 누락되었습니다.' })
      }

      // 기존 채팅방 조회
      let chat = await Chat.findOne({
         where: {
            itemId,
            [Op.or]: [
               { buyerId, sellerId },
               { buyerId: sellerId, sellerId: buyerId }, // 혹시나 반대 케이스
            ],
         },
         include: [
            { model: Item, as: 'item' },
            { model: Message, as: 'messages', limit: 1, order: [['createdAt', 'DESC']], separate: true },
            { model: User, as: 'buyer', attributes: ['id', 'name', 'nick'] },
            { model: User, as: 'seller', attributes: ['id', 'name', 'nick'] },
         ],
      })

      // 없으면 새로 생성
      if (!chat) {
         chat = await Chat.create({
            itemId,
            buyerId,
            sellerId,
         })

         // 다시 조회해서 관계 포함한 데이터 가져오기
         chat = await Chat.findOne({
            where: { id: chat.id },
            include: [
               { model: Item, as: 'item' },
               { model: Message, as: 'messages', limit: 1, order: [['createdAt', 'DESC']], separate: true },
               { model: User, as: 'buyer', attributes: ['id', 'name', 'nick'] },
               { model: User, as: 'seller', attributes: ['id', 'name', 'nick'] },
            ],
         })
      }

      const result = {
         ...chat.toJSON(),
         participants: [chat.buyer && { id: chat.buyer.id, name: chat.buyer.name, nick: chat.buyer.nick }, chat.seller && { id: chat.seller.id, name: chat.seller.name, nick: chat.seller.nick }].filter(Boolean),
         messages: chat.messages || [],
      }

      res.json({ success: true, chat: result })
   } catch (error) {
      error.status = 500
      error.message = '채팅방 조회/생성 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /api/chat/{chatId}/messages:
 *   get:
 *     summary: 채팅방 메시지 목록 조회
 *     description: 특정 채팅방(chatId)의 모든 메시지를 조회합니다. 각 메시지는 발신자(sender) 정보(nick 포함)를 포함합니다.
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 채팅방 ID
 *     responses:
 *       200:
 *         description: 메시지 목록 조회 성공
 *       401:
 *         description: 인증되지 않은 사용자
 *       404:
 *         description: 채팅방이 존재하지 않음
 *       500:
 *         description: 채팅 메시지 목록 조회 중 오류 발생
 */

router.get('/:chatId/messages', isLoggedIn, async (req, res, next) => {
   const { chatId } = req.params

   try {
      const chat = await Chat.findByPk(chatId, {
         include: [
            {
               model: Message,
               as: 'messages',
               include: [{ model: User, as: 'sender', attributes: ['id', 'nick'] }],
               separate: true,
               order: [['createdAt', 'ASC']],
            },
         ],
      })

      if (!chat) return res.status(404).json({ success: false, message: '채팅방이 없습니다.' })

      res.json({ success: true, messages: chat.messages || [] })
   } catch (error) {
      error.status = 500
      error.message = '채팅 메세지 목록 조회 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /api/chat/{chatId}/message:
 *   post:
 *     summary: 메시지 작성
 *     description: 특정 채팅방(chatId)에 메시지를 작성합니다.
 *     tags:
 *       - Chat
 *     parameters:
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 메시지를 작성할 채팅방 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 description: 작성할 메시지 내용
 *     responses:
 *       201:
 *         description: 메시지 작성 성공
 *       400:
 *         description: 메시지 내용 누락
 *       404:
 *         description: 채팅방이 존재하지 않음
 *       500:
 *         description: 메시지 전송 중 오류 발생
 */

router.post('/:chatId/message', isLoggedIn, async (req, res, next) => {
   const { chatId } = req.params
   const { content } = req.body

   if (!content) return res.status(400).json({ success: false, message: '메시지 내용을 입력하세요' })

   try {
      const chat = await Chat.findByPk(chatId)
      if (!chat) return res.status(404).json({ success: false, message: '채팅방이 없습니다.' })

      const message = await Message.create({ chatId, senderId: req.user.id, content })

      res.status(201).json({ success: true, message })
   } catch (error) {
      error.status = 500
      error.message = '메세지 전송 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
