// 로그인 상태확인
exports.isLoggedIn = (req, res, next) => {
   // console.log('---- isLoggedIn 호출 ----')
   // console.log('req.cookies:', req.cookies)
   // console.log('req.session:', req.session)
   // console.log('req.user:', req.user)
   // console.log('req.isAuthenticated():', req.isAuthenticated())
   // ↑ 테스트용
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

//매니저 상태확인

exports.isManager = (req, res, next) => {
   if (req.isAuthenticated()) {
      if (req.user && req.user.access === 'MANAGER') {
         next()
      } else {
         const error = new Error('관리자 권한이 필요합니다.')
         error.status = 403
         return next(error)
      }
   } else {
      const error = new Error('로그인이 필요합니다.')
      error.status = 403
      return next(error)
   }
}

//정지 상태확인

exports.isSuspended = (req, res, next) => {
   const datePass = (date) => {
      if (!date) return true
      return new Date(date) <= new Date()
   }

   if (req.isAuthenticated()) {
      if ((req.user && req.user.access === 'USER' && datePass(req.user.suspend)) || req.user.access === 'MANAGER') {
         next()
      } else {
         const error = new Error('정지 상태입니다.')
         error.status = 403
         return next(error)
      }
   } else {
      const error = new Error('로그인이 필요합니다.')
      erorr.status = 403
      return next(error)
   }
}
