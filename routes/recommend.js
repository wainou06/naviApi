const express = require('express')
const router = express.Router()
const { Item } = require('../models')
const Img = require('../models/img')
const { isLoggedIn } = require('./middlewares')
const { Op, fn, col } = require('sequelize')

/**
 * @swagger
 * /recommend:
 *   post:
 *     summary: 추천 유저들의 판매 중인 상품 조회
 *     description: 로그인된 사용자가 제공한 유저 ID 배열을 기반으로 해당 유저들이 판매 중인 상품 목록을 반환합니다.
 *     tags:
 *       - Items
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: integer
 *             example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: 추천 유저의 판매 상품 목록 또는 없음
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
 *                   example: 추천 유저 조회 성공
 *                 recommendList:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Item'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 추천 유저를 불러오는 중 오류가 발생했습니다.
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
