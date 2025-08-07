const express = require('express')
const router = express.Router()
const Keyword = require('../models/keyword')
const { isLoggedIn, isManager } = require('./middlewares')

router.post('/', isLoggedIn, isManager, async (req, res, next) => {
   try {
      console.log('formData:', req.body)

      if (!req.body) {
         const error = new Error('파일 업로드에 실패했습니다.')
         error.status = 400
         return next(error)
      }

      const exKeyword = await Keyword.findOne({
         where: { name: req.body.name },
      })

      if (exKeyword) {
         const error = new Error('이미 존재하는 키워드 입니다.')
         error.status = 404
         return next(error)
      }

      keyword = await Keyword.create({
         name: req.body.name,
      })

      res.status(200).json({
         success: true,
         keyword: {
            name: keyword.name,
         },
         message: '키워드가 성공적으로 등록되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = `키워드 등록 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

router.put('/:id', isLoggedIn, isManager, async (req, res, next) => {
   try {
      const keyword = await Keyword.findOne({
         where: { id: req.params.id },
      })

      if (!keyword) {
         const error = new Error('키워드를 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      await keyword.update({
         name: req.body.name,
      })

      const updatedKeyword = await Keyword.findOne({
         where: { name: req.params.id },
      })

      res.status(200).json({
         success: true,
         keyword: updatedKeyword,
         message: '키워드가 성공적으로 수정되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '키워드 수정 중 오류가 발생했습니다.'
      next(error)
   }
})

router.get('/', isLoggedIn, async (req, res, next) => {
   try {
      const count = await Keyword.count()
      const keywords = await Keyword.findAll({
         // order: [['createdAt', 'DESC']],
      })

      console.log('keywords: ', keywords)

      res.status(200).json({
         success: true,
         keywords,
         message: '전체 키워드 리스트를 성공적으로 불러왔습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '키워드 확인 중 오류가 발생했습니다.'
      next(error)
   }
})

router.delete('/:id', isLoggedIn, isManager, async (req, res, next) => {
   try {
      const keyword = await Keyword.findOne({
         where: { id: req.params.id },
      })

      if (!keyword) {
         const error = new Error('키워드를 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      await keyword.destroy()

      res.status(200).json({
         success: true,
         message: '키워드가 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '키워드 삭제 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
