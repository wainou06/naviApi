const express = require('express')
const { isLoggedIn, isManager } = require('./middlewares')
const Rating = require('../models/rating')
const PriceProposal = require('../models/priceproposal')
const router = express.Router()

router.get('/:id', isLoggedIn, async (req, res, next) => {
   try {
      const itemId = req.query.itemId

      const priceProposal = await PriceProposal.findOne({
         where: { userId: req.params.id, itemId: itemId },
      })

      if (!priceProposal) {
         res.status(200).json({
            success: true,
            priceProposal: null,
            rating: null,
         })
      }

      const rating = await Rating.findOne({
         where: { priceproposalId: priceProposal.id },
      })

      res.status(200).json({
         success: true,
         priceProposal,
         rating,
      })
   } catch (error) {
      error.status = 500
      error.message = `유저 조회 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

router.get('/getRating/:id', isLoggedIn, isManager, async (req, res, next) => {
   try {
      const id = req.params.id
      const rating = await Rating.findAll({
         where: { toUserId: id },
      })

      res.status(200).json({
         success: true,
         rating,
      })
   } catch (error) {
      error.status = 500
      error.message = `별점 조회 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

router.post('/', isLoggedIn, async (req, res, next) => {
   try {
      const data = req.body.data

      const exRating = await Rating.findOne({
         where: { priceproposalId: data.orderId },
      })

      if (exRating) {
         const error = new Error('이미 평가를 남겼습니다.')
         error.status = 4004
         return next(error)
      }

      const rating = await Rating.create({
         toUserId: data.toUserId,
         fromUserId: data.fromUserId,
         rating: data.rating,
         comment: data.comment,
         userId: data.userId,
         orderId: null,
         rentalOrderId: data.rentalOrderId,
         priceproposalId: data.orderId,
      })

      res.status(200).json({
         success: true,
         rating,
         message: '별점이 성공적으로 등록되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = `별점 등록 중 오류가 발생했습니다. ${error}`
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
