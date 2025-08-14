const express = require('express')
const router = express.Router()
const { PriceProposal, Item, User, sequelize, Img } = require('../models')
const { isLoggedIn } = require('./middlewares')
const { Op } = require('sequelize')

/**
 * @swagger
 * /price-proposals:
 *   post:
 *     summary: 가격 제안 생성
 *     description: 사용자가 특정 아이템에 대해 가격 제안을 등록합니다.
 *     tags: [PriceProposals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - itemId
 *               - proposedPrice
 *             properties:
 *               itemId:
 *                 type: integer
 *                 example: 123
 *                 description: 제안할 아이템의 ID
 *               proposedPrice:
 *                 type: number
 *                 example: 50000
 *                 description: 제안하는 가격
 *               message:
 *                 type: string
 *                 example: "조금 더 저렴하게 구매할 수 있을까요?"
 *                 description: 추가 메시지 (선택 사항)
 *     responses:
 *       201:
 *         description: 가격 제안 생성 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 itemId:
 *                   type: integer
 *                   example: 123
 *                 userId:
 *                   type: integer
 *                   example: 42
 *                 proposedPrice:
 *                   type: number
 *                   example: 50000
 *                 message:
 *                   type: string
 *                   example: "조금 더 저렴하게 구매할 수 있을까요?"
 *                 status:
 *                   type: string
 *                   example: pending
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-08-12T10:00:00Z
 *       400:
 *         description: 필수 필드 누락
 *       404:
 *         description: 아이템을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

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
/**
 * @swagger
 * /price-proposals/user/sent:
 *   get:
 *     summary: 내가 보낸 가격 제안들 조회
 *     description: 현재 로그인된 사용자가 보낸 모든 가격 제안을 조회합니다.
 *     tags: [PriceProposals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 보낸 가격 제안 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   itemId:
 *                     type: integer
 *                     example: 123
 *                   userId:
 *                     type: integer
 *                     example: 42
 *                   proposedPrice:
 *                     type: number
 *                     example: 50000
 *                   message:
 *                     type: string
 *                     example: "조금 더 저렴하게 구매할 수 있을까요?"
 *                   status:
 *                     type: string
 *                     example: pending
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   item:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       price:
 *                         type: number
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nick:
 *                             type: string
 *                       imgs:
 *                         type: array
 *                         items:
 *                           type: object
 *       500:
 *         description: 서버 오류
 */
//내가 보낸 가격 제안들 조회
router.get('/user/sent', isLoggedIn, async (req, res) => {
   try {
      const userId = req.user.id

      const proposals = await PriceProposal.findAll({
         where: { userId },
         include: [
            {
               model: Item,
               as: 'item',
               include: [
                  { model: User, as: 'user', attributes: ['id', 'nick'] },
                  { model: Img, as: 'imgs' }, // 이미지 관계 추가
               ],
            },
         ],
         order: [['createdAt', 'DESC']],
      })

      res.json(proposals)
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 에러 발생' })
   }
})
/**
 * @swagger
 * /price-proposals/user/received:
 *   get:
 *     summary: 내가 받은 가격 제안들 조회
 *     description: 현재 로그인된 사용자의 상품들에 대해 받은 모든 가격 제안을 조회합니다.
 *     tags: [PriceProposals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 받은 가격 제안 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   itemId:
 *                     type: integer
 *                     example: 123
 *                   userId:
 *                     type: integer
 *                     example: 42
 *                   proposedPrice:
 *                     type: number
 *                     example: 50000
 *                   status:
 *                     type: string
 *                     example: pending
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   item:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       price:
 *                         type: number
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nick:
 *                             type: string
 *                       imgs:
 *                         type: array
 *                         items:
 *                           type: object
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nick:
 *                         type: string
 *       500:
 *         description: 서버 오류
 */
// 내가 받은 가격 제안들 조회 (내 상품)
router.get('/user/received', isLoggedIn, async (req, res) => {
   try {
      const userId = req.user.id

      const proposals = await PriceProposal.findAll({
         include: [
            {
               model: Item,
               as: 'item',
               where: { userId },
               include: [
                  { model: User, as: 'user', attributes: ['id', 'nick'] },
                  { model: Img, as: 'imgs' }, // 이미지 관계 추가
               ],
            },
            {
               model: User,
               as: 'user',
               attributes: ['id', 'nick'],
            },
         ],
         order: [['createdAt', 'DESC']],
      })

      res.json(proposals)
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 에러 발생' })
   }
})
/**
 * @swagger
 * /price-proposals/user/completed:
 *   get:
 *     summary: 거래 완료된 내역 조회
 *     description: 현재 로그인된 사용자와 관련된 모든 거래 완료 내역을 조회합니다.
 *     tags: [PriceProposals]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 거래 완료 내역 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   itemId:
 *                     type: integer
 *                     example: 123
 *                   userId:
 *                     type: integer
 *                     example: 42
 *                   proposedPrice:
 *                     type: number
 *                     example: 50000
 *                   status:
 *                     type: string
 *                     example: accepted
 *                   createdAt:
 *                     type: string
 *                     format: date-time
 *                   updatedAt:
 *                     type: string
 *                     format: date-time
 *                   item:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       price:
 *                         type: number
 *                       user:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           nick:
 *                             type: string
 *                       imgs:
 *                         type: array
 *                         items:
 *                           type: object
 *                   user:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       nick:
 *                         type: string
 *       500:
 *         description: 서버 오류
 */
//내 거래 완료된 내역 조회
router.get('/user/completed', isLoggedIn, async (req, res) => {
   try {
      const userId = req.user.id

      const completedDeals = await PriceProposal.findAll({
         where: {
            status: 'accepted',
            [Op.or]: [{ userId }, { '$item.userId$': userId }],
         },
         include: [
            {
               model: Item,
               as: 'item',
               include: [
                  { model: User, as: 'user', attributes: ['id', 'nick'] },
                  { model: Img, as: 'imgs' }, // 이미지 관계 추가
               ],
            },
            {
               model: User,
               as: 'user',
               attributes: ['id', 'nick'],
            },
         ],
         order: [['updatedAt', 'DESC']],
      })

      res.json(completedDeals)
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 에러 발생' })
   }
})

/**
 * @swagger
 * /price-proposals/{itemId}:
 *   get:
 *     summary: 특정 아이템 가격 제안 리스트 조회
 *     description: 특정 아이템에 대해 사용자가 제안한 가격 리스트를 조회합니다.
 *     tags: [PriceProposals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 조회할 아이템 ID
 *         example: 123
 *     responses:
 *       200:
 *         description: 가격 제안 리스트 조회 성공
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: 서버 에러 발생
 */

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

/**
 * @swagger
 * /price-proposals/{proposalId}/status:
 *   patch:
 *     summary: 가격 제안 상태 변경
 *     description: 아이템 소유자가 특정 가격 제안의 상태를 변경합니다.
 *     tags: [PriceProposals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: integer
 *         description: 상태를 변경할 가격 제안 ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 description: 변경할 상태 (예: pending, accepted, rejected)
 *                 example: accepted
 *     responses:
 *       200:
 *         description: 상태 변경 성공
 *       403:
 *         description: 권한 없음
 *       404:
 *         description: 가격 제안 없음
 *       500:
 *         description: 서버 오류
 */

router.patch('/:proposalId/status', isLoggedIn, async (req, res) => {
   const { proposalId } = req.params
   const { status } = req.body

   const t = await sequelize.transaction()
   try {
      const proposal = await PriceProposal.findByPk(proposalId, {
         include: [
            { model: Item, as: 'item', include: [{ model: User, as: 'user', attributes: ['id', 'nick'] }] }, // 판매자 정보
            { model: User, as: 'user', attributes: ['id', 'nick'] }, // 제안자 정보
         ],
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
         proposal.item.itemSellStatus = 'SOLD_OUT'
         await proposal.item.save({ transaction: t })
      }

      await t.commit()

      res.json({
         message: '상태가 변경되었습니다.',
         updatedProposal: {
            ...proposal.toJSON(),
            buyer: proposal.user.toJSON(), // 구매자(제안자)
            seller: proposal.item.user.toJSON(), // 판매자
            item: proposal.item.toJSON(),
         },
      })
   } catch (error) {
      await t.rollback()
      console.error(error)
      res.status(500).json({ message: '서버 오류 발생' })
   }
})

module.exports = router
