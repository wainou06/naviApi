const express = require('express')
const User = require('../models/user')
const { isLoggedIn, isManager } = require('./middlewares')
const router = express.Router()

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
         attributes: ['id', 'name', 'nick', 'email', 'address', 'phone'],
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

module.exports = router
