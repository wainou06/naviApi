const express = require('express')
const router = express.Router()
const Item = require('../models/items')
const Img = require('../models/img')
const { Op, fn, col } = require('sequelize')
router.post('/recommend', async (req, res, next) => {
   try {
      const items = req.body
      const ids = items.map((x) => x.id)
      //  const recommendItems = await Item.findAll({ where: { id: ids } });
      const recommendItems = await Item.findAll({
         where: { id: { [Op.in]: ids } },
         include: [
            {
               model: Img,
               as: 'imgs',
               attributes: ['id', 'originName', 'imgUrl'],
               //    where: { repImgYn: 'Y' },
            },
         ],
         order: [[fn('FIELD', col('Item.id'), ...ids), 'ASC']], // id 순서 그대로
         distinct: true, // 중복 로우 방지(조인 시)
      })

      res.json({
         success: true,
         message: '추천 상품 조회 성공',
         recommendItems,
      })
   } catch (error) {
      error.status = 500
      error.message = `추천 상품을 불러오는 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

module.exports = router
