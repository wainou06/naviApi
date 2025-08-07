const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const morgan = require('morgan')
const session = require('express-session')
const passport = require('passport')
require('dotenv').config()
const cors = require('cors')

// 구글 관련 추가 ↓
require('./server/passport')
require('./passport')

// swagger 추가
const { swaggerUi, swaggerSpec } = require('./swagger')

const indexRouter = require('./routes')
const authRouter = require('./routes/auth')

const { sequelize } = require('./models')
const passportConfig = require('./passport')

const app = express()
passportConfig()
app.set('port', process.env.PORT || 8002)

sequelize
   .sync({ force: false })
   .then(() => {
      console.log('데이터베이스 연결 성공')
   })
   .catch((err) => {
      console.error(err)
   })

app.use(
   cors({
      origin: process.env.FRONTEND_APP_URL,
      credentials: true,
   })
)
app.use(morgan('dev'))
app.use(express.static(path.join(__dirname, 'uploads')))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser(process.env.COOKIE_SECRET))
const sessionMiddleware = session({
   resave: false,
   saveUninitialized: true,
   secret: process.env.COOKIE_SECRET,
   cookie: {
      httpOnly: true,
      secure: false,
   },
})
app.use(sessionMiddleware)

// swagger 추가
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use(passport.initialize())
app.use(passport.session())

app.use('/', indexRouter)
app.use('/auth', authRouter)

app.use((req, res, next) => {
   const error = new Error(`${req.method} ${req.url} 라우터가 없습니다.`)
   error.status = 404
   next(error)
})

app.use((err, req, res, next) => {
   const statusCode = err.status || 500
   const errorMessage = err.message || '서버 내부 오류'

   if (process.env.NODE_ENV === 'development') {
      console.log(err)
   }

   res.status(statusCode).json({
      success: false,
      message: errorMessage,
      error: err,
   })
})

app.listen(app.get('port'), () => {
   console.log(app.get('port'), '번 포트에서 대기중')
})
