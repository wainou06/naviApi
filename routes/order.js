const express = require('express')
const router = express.Router()
const { Order, Item } = require('../models')
const { isLoggedIn } = require('./middlewares')

/**
 * @swagger
 * /orders:
 *   post:
 *     summary: 주문 생성
 *     description: 로그인된 사용자가 새로운 주문을 생성합니다.
 *     tags: [Orders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 description: 주문할 상품 목록
 *                 items:
 *                   type: object
 *                   required:
 *                     - itemId
 *                   properties:
 *                     itemId:
 *                       type: integer
 *                       example: 123
 *               orderStatus:
 *                 type: string
 *                 description: 주문 상태 (기본값: PAYMENT_PENDING)
 *                 example: PAYMENT_PENDING
 *               useStart:
 *                 type: string
 *                 format: date-time
 *                 description: 사용 시작일
 *                 example: 2025-08-15T10:00:00Z
 *               useEnd:
 *                 type: string
 *                 format: date-time
 *                 description: 사용 종료일
 *                 example: 2025-08-20T18:00:00Z
 *               purchaseMethod:
 *                 type: string
 *                 description: 구매 방식 (shipping, meetup, other 중 하나)
 *                 example: shipping
 *     responses:
 *       201:
 *         description: 주문 생성 성공
 *       400:
 *         description: 잘못된 요청 (필수 값 누락, 유효하지 않은 purchaseMethod 등)
 *       404:
 *         description: 주문하려는 상품이 존재하지 않음
 *       500:
 *         description: 서버 오류
 */

router.post('/', isLoggedIn, async (req, res, next) => {
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
      error.status = 500
      error.message = '주문 생성 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /orders/list:
 *   get:
 *     summary: 주문 목록 조회
 *     description: 로그인된 사용자의 주문 목록을 페이징 및 날짜 범위로 조회합니다.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 페이지 번호 (기본값: 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 한 페이지당 항목 수 (기본값: 10)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회 시작 날짜 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 조회 종료 날짜 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 주문 목록 조회 성공
 *       500:
 *         description: 서버 오류
 */

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
      error.status = 500
      error.message = '주문 목록 조회 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /orders/{id}:
 *   get:
 *     summary: 주문 상세 조회
 *     description: 로그인된 사용자가 특정 주문의 상세 정보를 조회합니다.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 주문 ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 주문 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 userId:
 *                   type: integer
 *                   example: 42
 *                 orderStatus:
 *                   type: string
 *                   example: PAYMENT_PENDING
 *                 purchaseMethod:
 *                   type: string
 *                   example: shipping
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-08-12T10:00:00Z
 *                 items:
 *                   type: array
 *                   description: 주문에 포함된 상품 목록
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 101
 *                       name:
 *                         type: string
 *                         example: 상품명
 *       404:
 *         description: 주문이 존재하지 않음
 *       500:
 *         description: 서버 오류
 */

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
      error.status = 500
      error.message = '주문 상세 조회 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /orders/cancel/{id}:
 *   post:
 *     summary: 주문 취소
 *     description: 로그인된 사용자가 자신의 주문을 취소합니다.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 취소할 주문 ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 주문 취소 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 주문이 취소되었습니다.
 *                 order:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     orderStatus:
 *                       type: string
 *                       example: CANCELLED
 *                     userId:
 *                       type: integer
 *                       example: 42
 *                     purchaseMethod:
 *                       type: string
 *                       example: shipping
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: 2025-08-12T10:00:00Z
 *       404:
 *         description: 주문이 존재하지 않음
 *       500:
 *         description: 서버 오류
 */

router.post('/cancel/:id', isLoggedIn, async (req, res, next) => {
   try {
      const userId = req.user.id
      const order = await Order.findOne({ where: { id: req.params.id, userId } })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      order.orderStatus = 'CANCELLED'
      await order.save()

      res.json({ message: '주문이 취소되었습니다.', order })
   } catch (error) {
      error.status = 500
      error.message = '주문 취소 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /orders/delete/{id}:
 *   delete:
 *     summary: 주문 삭제
 *     description: 로그인된 사용자가 자신의 주문을 완전히 삭제합니다.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 삭제할 주문 ID
 *         example: 1
 *     responses:
 *       204:
 *         description: 주문 삭제 성공 (응답 본문 없음)
 *       404:
 *         description: 주문이 존재하지 않음
 *       500:
 *         description: 서버 오류
 */

router.delete('/delete/:id', isLoggedIn, async (req, res, next) => {
   try {
      const userId = req.user.id
      const order = await Order.findOne({ where: { id: req.params.id, userId } })
      if (!order) return res.status(404).json({ error: 'Order not found' })

      await order.destroy()
      res.status(204).end()
   } catch (error) {
       error.status = 500
       error.message = '주문 삭제 중 오류가 발생했습니다.'
       next(error)
   }
})

module.exports = router
