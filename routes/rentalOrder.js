const express = require('express')
const { RentalOrder, RentalOrderItem, RentalItem, Rating } = require('../models')
const { isLoggedIn } = require('./middlewares')
const router = express.Router()

// 주문 생성 (주문 + 주문상품 연결 테이블 같이 처리)
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

      // 총 수량 합산 (필요하면)
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

      res.status(201).json({
         success: true,
         message: '주문이 성공적으로 생성되었습니다.',
         data: rentalOrder,
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

      const rentalOrder = await RentalOrder.findOne({ where: { id, userId: req.user.id } })
      if (!rentalOrder) {
         return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' })
      }

      if (!orderStatus) {
         return res.status(400).json({ success: false, message: '변경할 주문 상태가 필요합니다.' })
      }

      await rentalOrder.update({ orderStatus })

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
      const rentalOrder = await RentalOrder.findOne({ where: { id, userId: req.user.id } })

      if (!rentalOrder) {
         return res.status(404).json({ success: false, message: '주문을 찾을 수 없습니다.' })
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
