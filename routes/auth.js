const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const User = require('../models/user')
const { isLoggedIn, isNotLoggedIn } = require('./middlewares')

const router = express.Router()

/**
 * @swagger
 * /auth/join:
 *    post:
 *       summary: 사용자 회원가입
 *       tags: [Auth]
 *       requestBody:
 *          required: true
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   required:
 *                      - email
 *                      - name
 *                      - password
 *                      - nick
 *                      - phone
 *                      - address
 *                   properties:
 *                      email:
 *                         type: string
 *                      name:
 *                         type: string
 *                      address:
 *                         type: string
 *                      phone:
 *                         type: string
 *                      nick:
 *                         type: string
 *                      password:
 *                         type: string
 *          responses:
 *             201:
 *                description: 회원가입 성공
 *             409:
 *                description: 이미 존재하는 사용자
 *             500:
 *                description: 서버 오류
 */
router.post('/join', isNotLoggedIn, async (req, res, next) => {
   try {
      const { email, name, address, password, nick, phone } = req.body

      const exUser = await User.findOne({
         where: { email },
      })

      if (exUser) {
         const error = new Error('이미 존재하는 사용자 입니다.')
         error.status = 409
         return next(error)
      }

      const hash = await bcrypt.hash(password, 12)

      const newUser = await User.create({
         email,
         name,
         password: hash,
         role: 'USER',
         address,
         nick,
         phone,
      })

      res.status(201).json({
         success: true,
         message: '회원가입을 성공하였습니다.',
         user: {
            id: newUser.id,
            name: newUser.name,
            role: newUser.role,
         },
      })
   } catch (error) {
      error.status = 500
      error.message = '회원가입 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /auth/login:
 *    post:
 *       summary: 사용자 로그인
 *       tags: [Auth]
 *       requestBody:
 *          required: true
 *          content:
 *             application/json:
 *                schema:
 *                   type: object
 *                   required:
 *                      - email
 *                      - password
 *                   properties:
 *                      email:
 *                         type: string
 *                      password:
 *                         type: string
 *          responses:
 *             200:
 *                description: 로그인 성공
 *             409:
 *                description: 로그인 실패
 *             500:
 *                description: 로그인 중 오류 발생
 */
router.post('/login', isNotLoggedIn, async (req, res, next) => {
   passport.authenticate('local', (authError, user, info) => {
      if (authError) {
         authError.status = 500
         authError.message = '인증 중 오류 발생'
         return next(authError)
      }

      if (!user) {
         const error = new Error(info.message || '로그인 실패')
         error.status = 401
         return next(error)
      }

      req.login(user, (loginError) => {
         if (loginError) {
            loginError.status = 500
            loginError.message = '로그인 중 오류 발생'
            return next(loginError)
         }
         res.json({
            success: true,
            message: '로그인 성공',
            user: {
               id: user.id,
               name: user.name,
               nick: user.nick,
               role: user.role,
            },
         })
      })
   })(req, res, next)
})

/**
 * @swagger
 * /auth/logout:
 *    get:
 *       summary: 사용자 로그아웃
 *       tags: [Auth]
 *       responses:
 *          200:
 *             description: 로그아웃 성공
 *          500:
 *             description: 로그아웃 중 오류 발생
 */
router.get('/logout', isLoggedIn, async (req, res, next) => {
   req.logout((logoutError) => {
      if (logoutError) {
         logoutError.status = 500
         logoutError.message = '로그아웃 중 오류 발생'
         return next(logoutError)
      }

      res.json({
         success: true,
         message: '로그아웃에 성공했습니다.',
      })
   })
})

/**
 * @swagger
 * /auth/status:
 *    get:
 *       summary: 로그인 상태 확인
 *       tags: [Auth]
 *       responses:
 *          200:
 *             description: 로그인 여부 및 사용자 정보
 *             content:
 *                application/json:
 *                   schema:
 *                      type: object
 *                      properties:
 *                         isAuthenticated:
 *                            type: boolean
 *                         user:
 *                            type: object
 *                            nullable: true
 *                            properties:
 *                               id:
 *                                  type: number
 *                               name:
 *                                  type: string
 *                               role:
 *                                  type: string
 *          500:
 *             description: 서버 오류
 */
router.get('/status', async (req, res, next) => {
   try {
      if (req.isAuthenticated()) {
         res.status(200).json({
            isAuthenticated: true,
            user: {
               id: req.user.id,
               name: req.user.name,
               nick: req.user.nick,
               role: req.user.role,
            },
         })
      } else {
         res.status(200).json({
            isAuthenticated: false,
         })
      }
   } catch (error) {
      error.status = 500
      error.message = '로그인 상태확인 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /auth/google:
 *   get:
 *     summary: 구글 로그인 시작
 *     description: Google OAuth 인증을 시작합니다.
 *     tags:
 *       - Auth
 *     responses:
 *       302:
 *         description: Google OAuth 인증 페이지로 리디렉션
 */
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

/**
 * @swagger
 * /auth/google/callback:
 *   get:
 *     summary: 구글 로그인 콜백
 *     description: Google 로그인 성공/실패 후 호출되는 콜백 URL입니다.
 *     tags:
 *       - Auth
 *     responses:
 *       302:
 *         description: 로그인 성공 시 프론트엔드로 리디렉션
 */
router.get(
   '/google/callback',
   passport.authenticate('google', {
      failureRedirect: 'http://localhost:5173/login',
      // session: false,
      session: true,
   }),
   (req, res) => {
      // 로그인 성공 시 프론트로 리디렉션
      res.redirect('http://localhost:5173')
   }
)

module.exports = router
