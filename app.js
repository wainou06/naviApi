// app.js
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const passport = require('passport')
const path = require('path')
require('dotenv').config()

const { swaggerUi, swaggerSpec } = require('./swagger')
const passportConfig = require('./passport') // 일반 Passport 설정
const googlePassport = require('./server') // Google 전략
const { sequelize } = require('./models')

// 라우터 불러오기
const indexRouter = require('./routes')
const itemsRouter = require('./routes/items')
const orderRouter = require('./routes/order')
const rentalItemsRouter = require('./routes/rentalItems')
const rentalOrderRouter = require('./routes/rentalOrder')
const authRouter = require('./routes/auth')
const keywordRouter = require('./routes/keyword')
const matchingRouter = require('./routes/matching')
const priceProposalRouter = require('./routes/priceproposal')
const infoRouter = require('./routes/info')
const chatRouter = require('./routes/chat')
const ratingRouter = require('./routes/rating')
const recommendRouter = require('./routes/recommend')

// DB 연결
sequelize
   .sync({ force: false })
   .then(() => console.log('데이터베이스 연결 성공'))
   .catch((err) => console.log('데이터베이스 연결 실패:', err))

const app = express()

// Passport 설정
passportConfig()
googlePassport()

app.set('port', process.env.PORT || 8002)

// CORS
app.use(
   cors({
      origin: 'http://localhost:5173',
      credentials: true,
   })
)

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

// Logger & Static
app.use(morgan('dev'))
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Body & Cookie Parser
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser(process.env.COOKIE_SECRET))

// Session
const sessionMiddleware = session({
   resave: false,
   saveUninitialized: true,
   secret: process.env.COOKIE_SECRET,
   cookie: { httpOnly: true, secure: false, sameSite: 'lax' },
})
app.use(sessionMiddleware)
app.set('sessionMiddleware', sessionMiddleware) // Socket.io용

// Passport 초기화
app.use(passport.initialize())
app.use(passport.session())

// 라우터
app.use('/', indexRouter)
app.use('/items', itemsRouter)
app.use('/order', orderRouter)
app.use('/rental', rentalItemsRouter)
app.use('/rental/orders', rentalOrderRouter)
app.use('/auth', authRouter)
app.use('/keyword', keywordRouter)
app.use('/matching', matchingRouter)
app.use('/priceProposal', priceProposalRouter)
app.use('/info', infoRouter)
app.use('/chats', chatRouter)
app.use('/rating', ratingRouter)
app.use('/recommend', recommendRouter)

// 404
app.use((req, res, next) => {
   const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`)
   error.status = 404
   next(error)
})

// 에러 처리
app.use((err, req, res, next) => {
   console.error(err)
   const statusCode = err.status || 500
   const message = err.message || '서버 내부 오류'
   res.status(statusCode).json({ success: false, message, error: err })
})

// app.js (혹은 server.js)
app.use((err, req, res, next) => {
   console.error(err) // 서버 콘솔
   res.status(err.status || 500).json({
      field: err.field || null,
      message: err.message || '알 수 없는 오류입니다.',
   })
})

module.exports = app
