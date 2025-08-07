const express = require('express')
const session = require('express-session')
const passport = require('passport')
const cors = require('cors')
require('./passport') // 전략 설정
const authRoutes = require('./routes/auth')

const app = express()

// CORS 설정 (React 프론트와 통신 허용)
app.use(
   cors({
      origin: 'http://localhost:5173',
      credentials: true,
   })
)

// 세션 설정
app.use(
   session({
      secret: 'secretcode',
      resave: false,
      saveUninitialized: true,
   })
)

app.use(passport.initialize())
app.use(passport.session())

// 라우터 등록
app.use('/auth', authRoutes)

app.listen(8000, () => {
   console.log('Server running on http://localhost:5173')
})
