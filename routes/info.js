const express = require('express')
const User = require('../models/user')
const { isLoggedIn, isManager } = require('./middlewares')
const bcrypt = require('bcrypt')
const router = express.Router()

/**
 * @swagger
 * /users/managerUser/{page}:
 *   get:
 *     summary: 전체 유저 목록 조회 (관리자)
 *     description: 관리자 권한으로 전체 유저를 페이지네이션하여 조회합니다.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: page
 *         required: true
 *         schema:
 *           type: integer
 *         description: 페이지 번호
 *     responses:
 *       200:
 *         description: 유저 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     pageCount:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                 message:
 *                   type: string
 *                   example: 전체 유저 리스트를 성공적으로 불러왔습니다.
 *       500:
 *         description: 서버 오류
 */

router.get('/managerUser/:page', isLoggedIn, isManager, async (req, res, next) => {
   try {
      const page = parseInt(req.params.page, 10) || 1
      const limit = 10
      const offset = (page - 1) * limit

      const count = await User.count()

      const users = await User.findAll({
         limit,
         offset,
         order: [['createdAt', 'DESC']],
         attributes: ['id', 'name', 'nick', 'email', 'address', 'phone', 'suspend'],
      })

      const pageCount = Math.ceil(count / limit)

      res.status(200).json({
         success: true,
         users,
         pagination: {
            totalUsers: count,
            currentPage: page,
            pageCount,
            limit,
         },
         message: '전체 유저 리스트를 성공적으로 불러왔습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = `유저 정보를 불러오는 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

/**
 * @swagger
 * /users/managerUserDelete/{id}:
 *   delete:
 *     summary: 유저 삭제 (관리자)
 *     description: 관리자 권한으로 특정 유저를 삭제합니다.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 삭제할 유저 ID
 *     responses:
 *       200:
 *         description: 유저 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   example: 사용자 한 명이 사라졌어요.
 *       404:
 *         description: 유저를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

router.delete('/managerUserDelete/:id', isLoggedIn, isManager, async (req, res, next) => {
   try {
      const user = await User.findOne({
         where: { id: req.params.id },
      })

      if (!user) {
         const error = new Error('유저를 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      await user.destroy()

      res.status(200).json({
         success: true,
         message: '사용자 한 명이 사라졌어요.',
      })
   } catch (error) {
      error.status = 500
      error.message = `계정 삭제 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

/**
 * @swagger
 * /users/managerUserSuspend/{id}:
 *   put:
 *     summary: 유저 계정 정지 설정 (관리자)
 *     description: 관리자가 유저의 정지 기간을 설정합니다.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 정지할 유저 ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               date:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-31T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: 유저 계정 정지 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 message:
 *                   type: string
 *                   example: 계정이 수정되었습니다.
 *       404:
 *         description: 유저를 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */

router.put('/managerUserSuspend/:id', isLoggedIn, isManager, async (req, res, next) => {
   try {
      const user = await User.findOne({
         where: { id: req.params.id },
      })

      if (!user) {
         const error = new Error('유저를 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      await user.update({
         suspend: req.body.date,
      })

      res.status(200).json({
         success: true,
         user: user,
         message: '계정이 수정되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '계정 정지 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /users/userPasswordEdit:
 *   put:
 *     summary: 유저 비밀번호 변경
 *     description: 현재 비밀번호를 확인한 후 새로운 비밀번호로 변경합니다.
 *     tags: [User]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               id:
 *                 type: integer
 *                 example: 5
 *               currentPassword:
 *                 type: string
 *                 example: oldPassword123
 *               newPassword:
 *                 type: string
 *                 example: newPassword456
 *     responses:
 *       200:
 *         description: 비밀번호 변경 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 user:
 *                   type: integer
 *                   example: 5
 *                 message:
 *                   type: string
 *                   example: 비밀번호가 수정되었습니다.
 *       404:
 *         description: 유저를 찾을 수 없거나 비밀번호 불일치
 *       500:
 *         description: 서버 오류
 */

router.put('/userPasswordEdit', isLoggedIn, async (req, res, next) => {
   try {
      const { id, currentPassword, newPassword } = req.body
      const user = await User.findOne({
         where: { id: id },
      })

      if (!user) {
         const error = new Error('유저를 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      const result = await bcrypt.compare(currentPassword, user.password)

      if (!result) {
         const error = new Error('비밀번호가 일치하지 않습니다.')
         error.status = 404
         return next(error)
      }

      const hash = await bcrypt.hash(newPassword, 12)

      await user.update({
         password: hash,
      })

      res.status(200).json({
         success: true,
         user: user.id,
         message: '비밀번호가 수정되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '비밀번호 수정 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
