const express = require('express')
const router = express.Router()
const { PriceProposal, Item, User, sequelize } = require('../models')
const { isLoggedIn } = require('./middlewares')

// 가격 제안 생성
router.post('/', isLoggedIn, async (req, res) => {
   try {
      const { itemId, proposedPrice, message } = req.body
      const userId = req.user.id

      if (!itemId || !proposedPrice) {
         return res.status(400).json({ error: 'itemId와 proposedPrice는 필수입니다.' })
      }

      const item = await Item.findByPk(itemId)
      if (!item) {
         return res.status(404).json({ error: '해당 아이템이 존재하지 않습니다.' })
      }

      const newProposal = await PriceProposal.create({
         itemId,
         userId,
         proposedPrice,
         message,
         status: 'pending', // 기본 상태 추가 필요
      })

      res.status(201).json(newProposal)
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 에러 발생' })
   }
})

// 가격 제안 목록 조회 (특정 아이템에 대한)
router.get('/:itemId', isLoggedIn, async (req, res) => {
   try {
      const { itemId } = req.params

      const proposals = await PriceProposal.findAll({
         where: { itemId },
         include: [
            {
               model: User,
               as: 'user',
               attributes: ['id', 'nick'],
            },
         ],
         order: [['createdAt', 'DESC']],
      })

      const result = proposals.map((p) => ({
         id: p.id,
         price: p.proposedPrice,
         deliveryMethod: p.deliveryMethod,
         userName: p.user?.nick || '익명',
         userAvatar: '/images/로그인상태.png',
         createdAt: p.createdAt,
         status: p.status || 'pending', // 상태도 같이 전달
      }))

      res.json(result)
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 에러 발생' })
   }
})

router.patch('/:proposalId/status', isLoggedIn, async (req, res) => {
   const { proposalId } = req.params
   const { status } = req.body

   const t = await sequelize.transaction()
   try {
      const proposal = await PriceProposal.findByPk(proposalId, {
         include: [{ model: Item, as: 'item' }],
         transaction: t,
         lock: t.LOCK.UPDATE,
      })

      if (!proposal) {
         await t.rollback()
         return res.status(404).json({ message: '가격 제안을 찾을 수 없습니다.' })
      }

      if (proposal.item.userId !== req.user.id) {
         await t.rollback()
         return res.status(403).json({ message: '권한이 없습니다.' })
      }

      proposal.status = status
      await proposal.save({ transaction: t })

      if (status === 'accepted') {
         proposal.item.itemSellStatus = 'SOLD_OUT' // 필드명 맞게 변경
         await proposal.item.save({ transaction: t })
      }

      await t.commit()

      res.json({
         message: '상태가 변경되었습니다.',
         updatedProposal: {
            ...proposal.toJSON(),
            item: proposal.item.toJSON(), // item 전체를 넣음
         },
      })

   } catch (error) {
      await t.rollback()
      console.error(error)
      res.status(500).json({ message: '서버 오류 발생' })
   }
})

module.exports = router
