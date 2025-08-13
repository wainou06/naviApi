const express = require('express')
const { RentalOrder, RentalOrderItem, RentalItem, Rating, User } = require('../models')
const { isLoggedIn } = require('./middlewares')
const router = express.Router()

/**
 * @swagger
 * /rental/orders:
 *   post:
 *     summary: 렌탈 주문 생성
 *     description: 사용자가 렌탈 상품을 선택하여 주문을 생성합니다.
 *     tags: [RentalOrders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *               - useStart
 *               - useEnd
 *             properties:
 *               orderStatus:
 *                 type: string
 *                 description: 주문 상태
 *                 example: pending
 *               items:
 *                 type: array
 *                 description: 주문할 렌탈 상품 목록
 *                 items:
 *                   type: object
 *                   required:
 *                     - rentalItemId
 *                     - quantity
 *                   properties:
 *                     rentalItemId:
 *                       type: integer
 *                       example: 10
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *               useStart:
 *                 type: string
 *                 format: date
 *                 description: 대여 시작일
 *                 example: 2025-08-15
 *               useEnd:
 *                 type: string
 *                 format: date
 *                 description: 대여 종료일
 *                 example: 2025-08-20
 *     responses:
 *       201:
 *         description: 주문 생성 성공
 *       400:
 *         description: 요청 데이터 오류
 *       500:
 *         description: 서버 오류
 */

router.post('/', isLoggedIn, async (req, res) => {
   try {
      const { orderStatus = 'pending', items, useStart, useEnd } = req.body
      // items: [{ rentalItemId, quantity }, ...]
      if (!items || !Array.isArray(items) || items.length === 0) {
         return res.status(400).json({ success: false, message: '주문할 상품이 필요합니다.' })
      }
      if (!useStart || !useEnd) {
         return res.status(400).json({ success: false, message: '대여 시작일과 종료일이 필요합니다.' })
      }

      // 날짜 유효성 검사
      const startDate = new Date(useStart)
      const endDate = new Date(useEnd)
      const today = new Date()
      today.setHours(0, 0, 0, 0) // 오늘 자정으로 설정

      if (startDate < today) {
         return res.status(400).json({ success: false, message: '시작일은 오늘 이후여야 합니다.' })
      }

      if (startDate >= endDate) {
         return res.status(400).json({ success: false, message: '종료일은 시작일보다 늦어야 합니다.' })
      }

      // 렌탈 상품들의 재고 및 상태 확인
      for (const item of items) {
         const rentalItem = await RentalItem.findByPk(item.rentalItemId)
         if (!rentalItem) {
            return res.status(400).json({ success: false, message: `렌탈 상품 ID ${item.rentalItemId}을 찾을 수 없습니다.` })
         }
         if (rentalItem.rentalStatus !== 'Y') {
            return res.status(400).json({ success: false, message: `${rentalItem.rentalItemNm}은(는) 현재 렌탈 불가능합니다.` })
         }
         if (rentalItem.quantity < item.quantity) {
            return res.status(400).json({ success: false, message: `${rentalItem.rentalItemNm}의 재고가 부족합니다. (요청: ${item.quantity}, 재고: ${rentalItem.quantity})` })
         }
      }

      // 총 수량 합산
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      if (totalQuantity <= 0) {
         return res.status(400).json({ success: false, message: '유효한 수량이 필요합니다.' })
      }

      // 주문 생성
      const rentalOrder = await RentalOrder.create({
         orderStatus,
         quantity: totalQuantity,
         useStart,
         useEnd,
         userId: req.user.id,
      })

      // 주문 아이템 테이블에 insert
      const orderItemsData = items.map((item) => ({
         rentalOrderId: rentalOrder.id,
         rentalItemId: item.rentalItemId,
         quantity: item.quantity,
      }))

      // RentalOrderItem 테이블에 한꺼번에 생성
      await RentalOrderItem.bulkCreate(orderItemsData)

      // 렌탈 상품의 재고 감소
      for (const item of items) {
         await RentalItem.decrement('quantity', {
            by: item.quantity,
            where: { id: item.rentalItemId },
         })
      }

      // 생성된 주문을 상세 정보와 함께 반환
      const createdOrder = await RentalOrder.findByPk(rentalOrder.id, {
         include: [
            {
               model: RentalItem,
               as: 'rentalItems',
               through: { attributes: ['quantity'] },
            },
         ],
      })

      res.status(201).json({
         success: true,
         message: '주문이 성공적으로 생성되었습니다.',
         data: createdOrder,
      })
   } catch (error) {
      console.error('주문 생성 오류:', error)
      res.status(500).json({
         success: false,
         message: '주문 생성에 실패했습니다.',
         error: error.message,
      })
   }
})

// 특정 렌탈 상품의 주문 목록 조회 (소유자/매니저용) - 누락된 엔드포인트 추가
router.get('/item/:rentalItemId', isLoggedIn, async (req, res) => {
   try {
      const rentalItemId = req.params.rentalItemId

      // 렌탈 상품 존재 확인 및 권한 검사
      const rentalItem = await RentalItem.findByPk(rentalItemId)
      if (!rentalItem) {
         return res.status(404).json({ success: false, message: '렌탈 상품을 찾을 수 없습니다.' })
      }

      // 소유자이거나 매니저인지 확인
      const isOwner = req.user.id === rentalItem.userId
      const isManager = req.user.access === 'MANAGER'

      if (!isOwner && !isManager) {
         return res.status(403).json({ success: false, message: '권한이 없습니다.' })
      }

      // 해당 렌탈 상품의 주문 목록 조회
      const orders = await RentalOrder.findAll({
         include: [
            {
               model: RentalOrderItem,
               as: 'rentalOrderItems',
               where: { rentalItemId },
               include: [
                  {
                     model: RentalItem,
                     as: 'rentalItem',
                  },
               ],
            },
            {
               model: User,
               as: 'user',
               attributes: ['id', 'name'],
            },
         ],
         order: [['createdAt', 'DESC']],
      })

      res.status(200).json({
         success: true,
         message: '렌탈 주문 목록 조회 성공',
         data: orders,
      })
   } catch (error) {
      console.error('렌탈 상품별 주문 목록 조회 오류:', error)
      res.status(500).json({
         success: false,
         message: '주문 목록 조회에 실패했습니다.',
         error: error.message,
      })
   }
})

// 주문 상세 조회 (id로 주문 정보 + 주문 상품들 포함)
router.get('/:id', isLoggedIn, async (req, res) => {
   try {
      const id = req.params.id
      const rentalOrder = await RentalOrder.findOne({
         where: { id, userId: req.user.id }, // 본인 주문만 조회
         include: [
            {
               model: RentalItem,
               as: 'rentalItems',
               through: { attributes: ['quantity'] }, // 중간 테이블 quantity 포함
            },
            {
               model: Rating,
               as: 'ratings',
            },
         ],
      })

      if (!rentalOrder) {
         return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' })
      }

      res.status(200).json({
         success: true,
         message: '주문 상세 조회 성공',
         data: rentalOrder,
      })
   } catch (error) {
      console.error('주문 상세 조회 오류:', error)
      res.status(500).json({
         success: false,
         message: '주문 상세 조회에 실패했습니다.',
         error: error.message,
      })
   }
})

// 주문 목록 조회 (본인 주문 리스트, 페이징 및 상태 필터링)
router.get('/list', isLoggedIn, async (req, res) => {
   try {
      const page = parseInt(req.query.page, 10) || 1
      const limit = parseInt(req.query.limit, 10) || 10
      const offset = (page - 1) * limit
      const orderStatus = req.query.orderStatus // 상태 필터 예: 'pending', 'completed'

      const whereClause = { userId: req.user.id }
      if (orderStatus) {
         whereClause.orderStatus = orderStatus
      }

      const count = await RentalOrder.count({ where: whereClause })

      const orders = await RentalOrder.findAll({
         where: whereClause,
         limit,
         offset,
         order: [['createdAt', 'DESC']],
         include: [
            {
               model: RentalItem,
               as: 'rentalItems',
               attributes: ['id', 'rentalItemNm', 'oneDayPrice'],
               through: { attributes: ['quantity'] },
            },
         ],
      })

      res.status(200).json({
         success: true,
         message: '주문 목록 조회 성공',
         data: orders,
         pagination: {
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
         },
      })
   } catch (error) {
      console.error('주문 목록 조회 오류:', error)
      res.status(500).json({
         success: false,
         message: '주문 목록 조회에 실패했습니다.',
         error: error.message,
      })
   }
})

// 주문 상태 수정 (ex. 주문 취소 등)
router.put('/:id', isLoggedIn, async (req, res) => {
   try {
      const id = req.params.id
      const { orderStatus } = req.body

      const rentalOrder = await RentalOrder.findOne({
         where: { id, userId: req.user.id },
         include: [
            {
               model: RentalOrderItem,
               as: 'orderItems',
               include: [
                  {
                     model: RentalItem,
                     as: 'rentalItem',
                  },
               ],
            },
         ],
      })

      if (!rentalOrder) {
         return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' })
      }

      if (!orderStatus) {
         return res.status(400).json({ success: false, message: '변경할 주문 상태가 필요합니다.' })
      }

      const oldStatus = rentalOrder.orderStatus

      await rentalOrder.update({ orderStatus })

      // 주문이 취소된 경우 재고 복구
      if (orderStatus === 'cancelled' && oldStatus !== 'cancelled') {
         for (const orderItem of rentalOrder.orderItems) {
            await RentalItem.increment('quantity', {
               by: orderItem.quantity,
               where: { id: orderItem.rentalItemId },
            })
         }
      }

      res.status(200).json({
         success: true,
         message: '주문 상태가 수정되었습니다.',
         data: rentalOrder,
      })
   } catch (error) {
      console.error('주문 상태 수정 오류:', error)
      res.status(500).json({
         success: false,
         message: '주문 상태 수정에 실패했습니다.',
         error: error.message,
      })
   }
})

// 주문 삭제 (사용자 본인 주문만 삭제 가능)
router.delete('/:id', isLoggedIn, async (req, res) => {
   try {
      const id = req.params.id
      const rentalOrder = await RentalOrder.findOne({
         where: { id, userId: req.user.id },
         include: [
            {
               model: RentalOrderItem,
               as: 'orderItems',
            },
         ],
      })

      if (!rentalOrder) {
         return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' })
      }

      // 주문이 완료되지 않은 경우에만 재고 복구
      if (rentalOrder.orderStatus !== 'completed') {
         for (const orderItem of rentalOrder.orderItems) {
            await RentalItem.increment('quantity', {
               by: orderItem.quantity,
               where: { id: orderItem.rentalItemId },
            })
         }
      }

      await rentalOrder.destroy()

      res.status(200).json({
         success: true,
         message: '주문이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      console.error('주문 삭제 오류:', error)
      res.status(500).json({
         success: false,
         message: '주문 삭제에 실패했습니다.',
         error: error.message,
      })
   }
})

module.exports = router
