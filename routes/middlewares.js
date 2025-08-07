// 로그인 상태확인
exports.isLoggedIn = (req, res, next) => {
   if (req.isAuthenticated()) {
      next()
   } else {
      const error = new Error('로그인이 필요합니다.')
      error.status = 403
      return next(error)
   }
}

// 비로그인 상태확인
exports.isNotLoggedIn = (req, res, next) => {
   if (!req.isAuthenticated()) {
      next()
   } else {
      const error = new Error('이미 로그인 된 상태입니다.')
      error.status = 400
      return next(error)
   }
}
