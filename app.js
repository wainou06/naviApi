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
const passportConfig = require('./passport')
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

// DB 연결
sequelize
   .sync({ force: false })
   .then(() => console.log('데이터베이스 연결 성공'))
   .catch((err) => console.log('데이터베이스 연결 실패:', err))

const app = express()
passportConfig()

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

// Passport
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

module.exports = app
