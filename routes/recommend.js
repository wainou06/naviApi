const express = require('express')
const router = express.Router()
const { Item } = require('../models')
const Img = require('../models/img')
const { isLoggedIn } = require('./middlewares')
const { Op, fn, col } = require('sequelize')

/**
 * @swagger
 * tags:
 * - name: Recommendation
 * description: 추천 관련 API
 * components:
 * schemas:
 * Item:
 * type: object
 * properties:
 * id:
 * type: integer
 * description: 아이템 ID
 * itemName:
 * type: string
 * description: 아이템 이름
 * price:
 * type: integer
 * description: 아이템 가격
 * itemSellStatus:
 * type: string
 * description: 아이템 판매 상태
 * example: "SELL"
 * Image:
 * type: object
 * properties:
 * id:
 * type: integer
 * url:
 * type: string
 * description: 이미지 URL
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
 * /recommend:
 * post:
 * summary: 추천 사용자 아이템 목록 조회
 * description: 요청 본문에 포함된 사용자 ID 목록을 기반으로, 판매 중인 아이템 목록을 추천합니다.
 * tags: [Recommendation]
 * security:
 * - BearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: array
 * items:
 * type: integer
 * example: [1, 2, 3]
 * responses:
 * 200:
 * description: 추천 아이템 목록 조회 성공
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
 * example: "추천 유저 조회 성공"
 * recommendList:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * itemName:
 * type: string
 * itemSellStatus:
 * type: string
 * imgs:
 * type: array
 * items:
 * $ref: '#/components/schemas/Image'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 */

router.post('/recommend', isLoggedIn, async (req, res, next) => {
   try {
      const ids = req.body

      const recommendList = await Item.findAll({
         where: {
            userId: { [Op.in]: ids },
            itemSellStatus: 'SELL',
         },
         include: [
            {
               model: Img,
               as: 'imgs',
               required: false,
            },
         ],
         order: [[fn('FIELD', col('Item.id'), ...ids)]],
         distinct: true,
      })

      if (recommendList.length <= 0) {
         return res.json({
            success: true,
            message: '추천 유저의 상품이 존재하지 않습니다.',
         })
      }

      res.json({
         success: true,
         message: '추천 유저 조회 성공',
         recommendList,
      })
   } catch (error) {
      console.log(error)
      error.status = 500
      error.message = `추천 유저를 불러오는 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

module.exports = router
