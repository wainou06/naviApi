const express = require('express')
const { isLoggedIn } = require('./middlewares')
const Rating = require('../models/rating')
const PriceProposal = require('../models/priceproposal')
const router = express.Router()

router.get('/:id', isLoggedIn, async (req, res, next) => {
   try {
      const itemId = req.query.itemId

      const priceProposal = await PriceProposal.findOne({
         where: { userId: req.params.id, itemId: itemId },
      })

      res.status(200).json({
         success: true,
         priceProposal,
      })
   } catch (error) {
      error.status = 500
      error.message = `유저 조회 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

router.post('/:id', isLoggedIn, async (req, res, next) => {
   try {
      const data = req.body

      const trade = await PriceProposal.findOne({
         where: { id: req.params.id },
      })
      console.log(trade)

      const rating = await Rating.create({
         toUserId: data.toUserId,
         fromUserId: data.fromUserId,
         rating: data.rating,
         comment: data.comment,
         orderId: data.orderId,
         rentalOrderId: data.rentalOrderId,
      })

      res.status(200).json({
         success: true,
         rating,
         message: '별점이 성공적으로 등록되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '별점 등록 중 오류가 발생했습니다.'
      next(error)
   }
})

router.post('/rental/:id', isLoggedIn, async (req, res, next) => {
   try {
      const data = req.body

      const rating = await Rating.create({
         toUserId: data.toUserId,
         fromUserId: data.fromUserId,
         rating: data.rating,
         comment: data.comment,
         orderId: data?.orderId,
         userId: data?.userId,
         rentalOrderId: data?.rentalOrderId,
      })
   } catch (error) {
      error.status = 500
      error.message = '렌탈 별점 등록 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
