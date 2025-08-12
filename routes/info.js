const express = require('express')
const router = express.Router()

router.get('/managerUser', async (req, res, next) => {
   try {
   } catch (error) {
      error.status = 500
      error.message = '유저 정보를 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
