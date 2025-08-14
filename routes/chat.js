const express = require('express')
const router = express.Router()
const { Chat, Message, User, Item } = require('../models')
const { isLoggedIn } = require('./middlewares')
const { Op } = require('sequelize')

// 내 채팅방 목록 조회
router.get('/', isLoggedIn, async (req, res) => {
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
      console.error(error)
      res.status(500).json({ success: false, message: '서버 오류 발생' })
   }
})

// 채팅방 생성 또는 기존 채팅방 조회
router.post('/create', isLoggedIn, async (req, res) => {
   const { itemId, sellerId } = req.body
   const buyerId = req.user.id

   if (!itemId || !sellerId) {
      return res.status(400).json({ success: false, message: '필수 데이터 누락' })
   }

   try {
      let chat = await Chat.findOne({
         where: { itemId, buyerId, sellerId },
         include: [{ model: Message, as: 'messages' }],
      })

      if (!chat) {
         chat = await Chat.create({ itemId, buyerId, sellerId })
      }

      res.json({
         success: true,
         chat: { id: chat.id, messages: chat.messages || [] },
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '서버 오류 발생' })
   }
})

// 채팅방 메시지 목록 조회
router.get('/:chatId/messages', isLoggedIn, async (req, res) => {
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
      console.error(error)
      res.status(500).json({ success: false, message: '서버 오류 발생' })
   }
})

// 메시지 작성
router.post('/:chatId/message', isLoggedIn, async (req, res) => {
   const { chatId } = req.params
   const { content } = req.body

   if (!content) return res.status(400).json({ success: false, message: '메시지 내용을 입력하세요' })

   try {
      const chat = await Chat.findByPk(chatId)
      if (!chat) return res.status(404).json({ success: false, message: '채팅방이 없습니다.' })

      const message = await Message.create({ chatId, senderId: req.user.id, content })

      res.status(201).json({ success: true, message })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '서버 오류 발생' })
   }
})

module.exports = router
