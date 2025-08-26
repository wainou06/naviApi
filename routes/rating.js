const express = require('express')
const { isLoggedIn, isManager } = require('./middlewares')
const Rating = require('../models/rating')
const PriceProposal = require('../models/priceproposal')
const router = express.Router()

/**
 * @swagger
 * tags:
 * - name: Rating
 * description: 사용자 별점 및 평가 관리 API
 * - name: PriceProposal
 * description: 가격 제안 관리 API
 * components:
 * schemas:
 * Rating:
 * type: object
 * properties:
 * id:
 * type: integer
 * description: 별점 ID
 * toUserId:
 * type: integer
 * description: 평가를 받은 사용자 ID
 * fromUserId:
 * type: integer
 * description: 평가를 남긴 사용자 ID
 * rating:
 * type: number
 * description: 별점 (1.0 - 5.0)
 * comment:
 * type: string
 * description: 평가 코멘트
 * priceproposalId:
 * type: integer
 * description: 연결된 가격 제안 ID
 * Error:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: false
 * message:
 * type: string
 * example: "오류 메시지"
 * securitySchemes:
 * BearerAuth:
 * type: http
 * scheme: bearer
 * bearerFormat: JWT
 */

/**
 * @swagger
 * /ratings/getProposalAndRating/{id}:
 * get:
 * summary: 특정 유저의 가격 제안 및 별점 조회
 * description: 특정 아이템에 대한 유저의 가격 제안과 그에 대한 별점 정보를 함께 조회합니다.
 * tags: [PriceProposal, Rating]
 * security:
 * - BearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: 유저 ID
 * - in: query
 * name: itemId
 * required: true
 * schema:
 * type: integer
 * description: 아이템 ID
 * responses:
 * 200:
 * description: 성공적으로 조회
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * priceProposal:
 * $ref: '#/components/schemas/PriceProposal'
 * rating:
 * $ref: '#/components/schemas/Rating'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
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
 * /ratings/getRatingByUser/{id}:
 * get:
 * summary: 특정 유저가 받은 모든 별점 조회
 * description: 매니저 권한으로 특정 유저가 받은 모든 별점 정보를 조회합니다.
 * tags: [Rating]
 * security:
 * - BearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: 별점 조회 대상 유저 ID
 * responses:
 * 200:
 * description: 성공적으로 조회
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * rating:
 * type: array
 * items:
 * $ref: '#/components/schemas/Rating'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
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
 * post:
 * summary: 별점 등록
 * description: 아이템 거래에 대한 별점과 코멘트를 등록합니다.
 * tags: [Rating]
 * security:
 * - BearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - data
 * properties:
 * data:
 * type: object
 * required:
 * - toUserId
 * - fromUserId
 * - rating
 * - orderId
 * properties:
 * toUserId:
 * type: integer
 * example: 12
 * fromUserId:
 * type: integer
 * example: 25
 * rating:
 * type: number
 * example: 4.5
 * comment:
 * type: string
 * example: "친절하고 좋은 거래였습니다!"
 * orderId:
 * type: integer
 * example: 10
 * rentalOrderId:
 * type: integer
 * example: 15
 * responses:
 * 200:
 * description: 별점 등록 성공
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * rating:
 * $ref: '#/components/schemas/Rating'
 * message:
 * type: string
 * example: "별점이 성공적으로 등록되었습니다."
 * 409:
 * description: 이미 평가를 남김
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
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
 * post:
 * summary: 렌탈 관련 별점 등록
 * description: 렌탈 서비스에 대한 별점 및 평가를 등록합니다.
 * tags: [Rating]
 * security:
 * - BearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: (불필요한 파라미터) 이 라우트에서는 사용되지 않습니다.
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * toUserId:
 * type: integer
 * example: 1
 * fromUserId:
 * type: integer
 * example: 2
 * rating:
 * type: number
 * example: 5.0
 * comment:
 * type: string
 * example: "렌탈 서비스가 매우 좋았습니다."
 * rentalOrderId:
 * type: integer
 * example: 30
 * responses:
 * 200:
 * description: 별점 등록 성공
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * message:
 * type: string
 * example: "렌탈 별점 등록이 성공했습니다."
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
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
