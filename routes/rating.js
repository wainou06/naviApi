const express = require('express')
const { isLoggedIn, isManager } = require('./middlewares')
const Rating = require('../models/rating')
const PriceProposal = require('../models/priceproposal')
const router = express.Router()

/**
 * @swagger
 * /ratings/{id}:
 *   get:
 *     summary: 사용자와 아이템 ID로 가격 제안 및 평가 정보 조회
 *     description: 특정 사용자(userId)와 아이템(itemId)의 가격 제안 및 해당 제안에 대한 별점 정보를 반환합니다.
 *     tags: [Rating]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 사용자 ID
 *       - in: query
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 아이템 ID
 *     responses:
 *       200:
 *         description: 가격 제안 및 평가 정보 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 priceProposal:
 *                   $ref: '#/components/schemas/PriceProposal'
 *                 rating:
 *                   $ref: '#/components/schemas/Rating'
 *       500:
 *         description: 서버 오류
 */

router.get('/:id', isLoggedIn, async (req, res, next) => {
   try {
      const itemId = req.query.itemId

      const priceProposal = await PriceProposal.findOne({
         where: { userId: req.params.id, itemId: itemId },
      })

      if (!priceProposal) {
         return res.status(200).json({
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

/**
 * @swagger
 * /ratings/getRating/{id}:
 *   get:
 *     summary: 특정 유저가 받은 모든 별점 조회 (관리자 전용)
 *     description: 관리자 권한으로 특정 유저(toUserId)가 받은 모든 별점 정보를 조회합니다.
 *     tags: [Rating]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 평가를 받은 사용자 ID
 *     responses:
 *       200:
 *         description: 별점 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 rating:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Rating'
 *       500:
 *         description: 서버 오류
 */

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

/**
 * @swagger
 * /ratings:
 *   post:
 *     summary: 가격 제안에 대한 별점 등록
 *     description: 가격 제안(orderId)에 대한 별점과 코멘트를 등록합니다.
 *     tags: [Rating]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               data:
 *                 type: object
 *                 required:
 *                   - toUserId
 *                   - fromUserId
 *                   - rating
 *                   - orderId
 *                 properties:
 *                   toUserId:
 *                     type: integer
 *                     example: 12
 *                   fromUserId:
 *                     type: integer
 *                     example: 25
 *                   rating:
 *                     type: number
 *                     example: 4.5
 *                   comment:
 *                     type: string
 *                     example: "친절하고 좋은 거래였습니다!"
 *                   orderId:
 *                     type: integer
 *                     example: 10
 *                   rentalOrderId:
 *                     type: integer
 *                     example: 15
 *     responses:
 *       200:
 *         description: 별점 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 rating:
 *                   $ref: '#/components/schemas/Rating'
 *                 message:
 *                   type: string
 *                   example: "별점이 성공적으로 등록되었습니다."
 *       409:
 *         description: 이미 평가를 남김
 *       500:
 *         description: 서버 오류
 */

router.post('/', isLoggedIn, async (req, res, next) => {
   try {
      const data = req.body.data

      const exRating = await Rating.findOne({
         where: { priceproposalId: data.orderId },
      })

      if (exRating) {
         const error = new Error('이미 평가를 남겼습니다.')
         error.status = 404
         return next(error)
      }

      const rating = await Rating.create({
         toUserId: data.toUserId,
         fromUserId: data.fromUserId,
         rating: data.rating,
         comment: data.comment,
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

/**
 * @swagger
 * /ratings/rental/{id}:
 *   post:
 *     summary: 렌탈 거래에 대한 별점 등록
 *     description: 렌탈 거래(rentalOrderId)에 대한 별점 및 평가를 등록합니다.
 *     tags: [Rating]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: integer
 *         description: (사용되지 않음)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toUserId
 *               - fromUserId
 *               - rating
 *               - rentalOrderId
 *             properties:
 *               toUserId:
 *                 type: integer
 *                 example: 1
 *               fromUserId:
 *                 type: integer
 *                 example: 2
 *               rating:
 *                 type: number
 *                 example: 5.0
 *               comment:
 *                 type: string
 *                 example: "렌탈 서비스가 매우 좋았습니다."
 *               rentalOrderId:
 *                 type: integer
 *                 example: 30
 *     responses:
 *       200:
 *         description: 렌탈 별점 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "렌탈 별점 등록이 성공했습니다."
 *       500:
 *         description: 서버 오류
 */

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
