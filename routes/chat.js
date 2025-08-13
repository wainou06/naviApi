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
         where: {
            [Op.or]: [{ buyerId: userId }, { sellerId: userId }],
         },
         include: [
            { model: Item, as: 'item' }, // as 명시
            {
               model: Message,
               as: 'messages',
               limit: 1,
               order: [['createdAt', 'DESC']],
               separate: true, // 필수
            },
         ],
         order: [['updatedAt', 'DESC']],
      })

      res.json({ success: true, chats })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '서버 오류 발생' })
   }
})

// 1. 채팅방 생성 or 기존 채팅방 조회
router.post('/create', isLoggedIn, async (req, res) => {
   const { itemId, sellerId } = req.body
   const buyerId = req.user.id // 로그인한 사용자 ID로 고정

   if (!itemId || !sellerId) {
      return res.status(400).json({ message: '필수 데이터 누락' })
   }

   try {
      let chat = await Chat.findOne({
         where: { itemId, buyerId, sellerId },
         include: [{ model: Message, as: 'messages' }],
      })

      if (!chat) {
         chat = await Chat.create({ itemId, buyerId, sellerId })
      }

      res.json({ chat })
   } catch (error) {
      console.error(error)
      res.status(500).json({ message: '서버 오류 발생' })
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
               include: [{ model: User, as: 'sender', attributes: ['id', 'username'] }],
               separate: true,
               order: [['createdAt', 'ASC']],
            },
         ],
      })

      if (!chat) return res.status(404).json({ message: '채팅방이 없습니다.' })

      res.json({ messages: chat.messages })
   } catch (error) {
      console.error(error)
      res.status(500).json({ message: '서버 오류 발생' })
   }
})

// 3. 채팅방에 메시지 작성
router.post('/:chatId/message', isLoggedIn, async (req, res) => {
   const { chatId } = req.params
   const { content } = req.body

   if (!content) return res.status(400).json({ message: '메시지 내용을 입력하세요' })

   try {
      const chat = await Chat.findByPk(chatId)
      if (!chat) return res.status(404).json({ message: '채팅방이 없습니다.' })

      const message = await Message.create({
         chatId,
         senderId: req.user.id,
         content,
      })

      res.status(201).json({ message })
   } catch (error) {
      console.error(error)
      res.status(500).json({ message: '서버 오류 발생' })
   }
})

module.exports = router
