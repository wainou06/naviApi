const express = require('express')
const router = express.Router()
const { Order, Item } = require('../models')
const { isLoggedIn } = require('./middlewares')

// 1. 주문 생성
router.post('/', isLoggedIn, async (req, res) => {
   try {
      const { items, orderStatus, useStart, useEnd, purchaseMethod } = req.body
      const userId = req.user.id

      if (!items || !Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ error: '주문 상품 정보가 필요합니다.' })
      }

      // purchaseMethod 유효성 체크 (필요 시)
      const validMethods = ['shipping', 'meetup', 'other']
      if (purchaseMethod && !validMethods.includes(purchaseMethod)) {
         return res.status(400).json({ error: 'Invalid purchase method' })
      }

      // 주문 생성
      const newOrder = await Order.create({
         userId,
         orderStatus: orderStatus || 'PAYMENT_PENDING',
         purchaseMethod,
         useStart,
         useEnd,
      })

      // 주문 아이템 각각 처리 (예: orderId FK 세팅 및 상태 변경)
      for (const itemData of items) {
         const item = await Item.findByPk(itemData.itemId)
         if (!item) {
            return res.status(404).json({ error: `Item ${itemData.itemId} not found` })
         }
         await item.update({ orderId: newOrder.id, itemSellStatus: 'RESERVATION' })
      }

      res.status(201).json(newOrder)
   } catch (error) {
      res.status(400).json({ error: error.message })
   }
})

// 2. 주문 목록 조회 (본인 주문만 + 페이징, 필터링 추가)
router.get('/list', isLoggedIn, async (req, res) => {
   try {
      const userId = req.user.id
      const { page = 1, limit = 10, startDate, endDate } = req.query
      const offset = (page - 1) * limit

      const where = { userId }
      if (startDate && endDate) {
         where.createdAt = {
            $between: [new Date(startDate), new Date(endDate)],
         }
      }

      const orders = await Order.findAndCountAll({
         where,
         limit: parseInt(limit),
         offset: parseInt(offset),
         order: [['createdAt', 'DESC']],
         include: [{ model: Item }],
      })

      res.json({
         orders: orders.rows,
         pagination: { total: orders.count, page: parseInt(page), limit: parseInt(limit) },
      })
   } catch (error) {
      res.status(500).json({ error: error.message })
   }
})

// 3. 특정 주문 조회 (본인 주문만)
router.get('/:id', isLoggedIn, async (req, res) => {
   try {
      const userId = req.user.id
      const order = await Order.findOne({
         where: { id: req.params.id, userId },
         include: [{ model: Item }],
      })
      if (!order) return res.status(404).json({ error: 'Order not found' })
      res.json(order)
   } catch (error) {
      res.status(500).json({ error: error.message })
   }
})

// 4. 주문 상태 변경 (본인 주문만)
router.post('/cancel/:id', isLoggedIn, async (req, res) => {
   try {
      const userId = req.user.id
      const order = await Order.findOne({ where: { id: req.params.id, userId } })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      order.orderStatus = 'CANCELLED'
      await order.save()

      res.json({ message: '주문이 취소되었습니다.', order })
   } catch (error) {
      res.status(500).json({ error: error.message })
   }
})

// 5. 주문 삭제 (본인 주문만)
router.delete('/delete/:id', isLoggedIn, async (req, res) => {
   try {
      const userId = req.user.id
      const order = await Order.findOne({ where: { id: req.params.id, userId } })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      await order.destroy()
      res.status(204).end()
   } catch (error) {
      res.status(500).json({ error: error.message })
   }
})

module.exports = router
