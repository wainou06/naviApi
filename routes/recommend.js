const express = require('express')
const router = express.Router()
const { Item } = require('../models')
const Img = require('../models/img')
const { isLoggedIn } = require('./middlewares')
const { Op, fn, col } = require('sequelize')

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
