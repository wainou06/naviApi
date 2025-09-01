const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const User = require('../models/user')
const { isLoggedIn, isNotLoggedIn, isSuspended } = require('./middlewares')

const router = express.Router()

/**
 * @swagger
 * /auth/join:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 회원가입
 *     description: 새 사용자를 등록합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - password
 *               - nick
 *               - phone
 *               - address
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "test@example.com"
 *               name:
 *                 type: string
 *                 example: "홍길동"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Password123!"
 *               nick:
 *                 type: string
 *                 example: "nickname"
 *               phone:
 *                 type: string
 *                 example: "010-1234-5678"
 *               address:
 *                 type: string
 *                 example: "서울시 강남구"
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "회원가입을 성공하였습니다."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "홍길동"
 *                     access:
 *                       type: string
 *                       example: "USER"
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "회원가입 중 오류가 발생했습니다."
 */
router.post('/join', isNotLoggedIn, async (req, res, next) => {
   try {
      const { email, name, address, password, nick, phone } = req.body

      const hash = await bcrypt.hash(password, 12)

      const newUser = await User.create({
         email,
         name,
         password: hash,
         access: 'USER',
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
            access: newUser.access,
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
 * /auth/check-email:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 이메일 중복 확인
 *     description: 입력한 이메일이 이미 등록되어 있는지 확인합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "test@example.com"
 *     responses:
 *       200:
 *         description: 사용 가능한 이메일
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용 가능한 이메일입니다."
 *       409:
 *         description: 이미 존재하는 이메일
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 field:
 *                   type: string
 *                   example: "email"
 *                 message:
 *                   type: string
 *                   example: "이미 존재하는 이메일입니다."
 */
router.post('/check-email', async (req, res, next) => {
   try {
      const { email } = req.body
      const user = await User.findOne({ where: { email } })
      if (user) return res.status(409).json({ field: 'email', message: '이미 존재하는 이메일입니다.' })
      return res.json({ message: '사용 가능한 이메일입니다.' })
   } catch (err) {
      next(err)
   }
})

/**
 * @swagger
 * /auth/check-nick:
 *   post:
 *     tags:
 *       - Auth
 *     summary: 닉네임 중복 확인
 *     description: 입력한 닉네임이 이미 등록되어 있는지 확인합니다.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nick
 *             properties:
 *               nick:
 *                 type: string
 *                 example: "nickname123"
 *     responses:
 *       200:
 *         description: 사용 가능한 닉네임
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "사용 가능한 닉네임입니다."
 *       409:
 *         description: 이미 존재하는 닉네임
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 field:
 *                   type: string
 *                   example: "nick"
 *                 message:
 *                   type: string
 *                   example: "이미 존재하는 닉네임입니다."
 */
router.post('/check-nick', async (req, res, next) => {
   try {
      const { nick } = req.body
      const user = await User.findOne({ where: { nick } })
      if (user) return res.status(409).json({ field: 'nick', message: '이미 존재하는 닉네임입니다.' })
      return res.json({ message: '사용 가능한 닉네임입니다.' })
   } catch (err) {
      next(err)
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
               access: user.access,
               phone: user.phone,
               address: user.address,
               suspend: user.suspend,
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
         const userFromDB = await User.findOne({
            where: { id: req.user.id },
            attributes: ['id', 'name', 'nick', 'email', 'access', 'phone', 'address'],
         })

         if (!userFromDB) {
            return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' })
         }

         res.status(200).json({
            isAuthenticated: true,
            user: userFromDB,
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
 * /api/auth/my:
 *   put:
 *     summary: 회원 정보 수정
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []   # 세션 인증이 cookie 기반일 때
 *     requestBody:
 *       description: 수정할 회원 정보 (nick, phone, address 중 선택 가능)
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nick:
 *                 type: string
 *                 description: 닉네임
 *               phone:
 *                 type: string
 *                 description: 전화번호
 *               address:
 *                 type: string
 *                 description: 주소
 *             example:
 *               nick: "새닉네임"
 *               phone: "010-1234-5678"
 *               address: "서울시 강남구"
 *     responses:
 *       200:
 *         description: 회원 정보 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 회원 정보가 수정되었습니다.
 *       400:
 *         description: 수정할 정보가 없거나 잘못된 요청
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 수정할 정보가 없습니다.
 *       401:
 *         description: 로그인이 필요한 경우
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 로그인이 필요합니다.
 *       500:
 *         description: 서버 내부 오류
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: 유저 정보를 불러오는 중 오류가 발생했습니다.
 */
router.put('/my', isLoggedIn, isSuspended, async (req, res, next) => {
   try {
      if (!req.isAuthenticated()) {
         return res.status(401).json({
            success: false,
            message: '로그인이 필요합니다.',
         })
      }

      const fieldsToUpdate = {}
      const allowedFields = ['nick', 'phone', 'address']

      allowedFields.forEach((field) => {
         if (req.body[field] !== undefined && req.body[field] !== '') {
            fieldsToUpdate[field] = req.body[field]
         }
      })

      if (Object.keys(fieldsToUpdate).length === 0) {
         return res.status(400).json({ success: false, message: '수정할 정보가 없습니다.' })
      }

      await User.update(fieldsToUpdate, { where: { id: req.user.id } })

      res.json({
         success: true,
         message: '회원 정보가 수정되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '유저 정보를 불러오는 중 오류가 발생했습니다.'
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
      session: true,
   }),
   (req, res) => {
      res.redirect('http://localhost:5173')
   }
)

/**
 * @swagger
 * /auth/forgot-password-email:
 *   post:
 *     summary: 이메일로 임시 비밀번호 발급
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 description: 사용자 이메일
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: 임시 비밀번호 발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 임시 비밀번호가 발급되었습니다.
 *                 tempPassword:
 *                   type: string
 *                   example: ab12cd34
 *       400:
 *         description: 이메일이 존재하지 않음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 이메일이 없습니다
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 임시 비밀번호를 발급하는 중 오류가 발생했습니다.
 */
router.post('/forgot-password-email', async (req, res, next) => {
   const { email } = req.body
   try {
      const user = await User.findOne({ where: { email } })
      if (!user) return res.status(400).json({ message: '해당 이메일의 사용자가 없습니다.' })

      const tempPassword = Math.random().toString(36).slice(-8)

      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      user.password = hashedPassword
      await user.save()

      res.json({
         message: '임시 비밀번호가 발급되었습니다.',
         tempPassword: tempPassword,
      })
   } catch (error) {
      error.status = 500
      error.message = '임시 비밀번호를 발급하는 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /auth/forgot-password-phone:
 *   post:
 *     summary: 전화번호로 임시 비밀번호 발급
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *             properties:
 *               phone:
 *                 type: string
 *                 description: 사용자 전화번호
 *                 example: 010-1234-5678
 *     responses:
 *       200:
 *         description: 임시 비밀번호 발급 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 임시 비밀번호가 발급되었습니다.
 *                 tempPassword:
 *                   type: string
 *                   example: ab12cd34
 *       400:
 *         description: 해당 전화번호의 유저가 없음
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 해당 전화번호의 유저가 없습니다.
 *       500:
 *         description: 서버 에러
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: 임시 비밀번호를 발급하는 중 오류가 발생했습니다.
 */
router.post('/forgot-password-phone', async (req, res, next) => {
   const { phone } = req.body

   try {
      const user = await User.findOne({ where: { phone } })
      if (!user) {
         return res.status(400).json({ message: '해당 전화번호의 사용자가 없습니다.' })
      }

      const tempPassword = Math.random().toString(36).slice(2, 10)

      const bcrypt = require('bcrypt')
      const hashedPassword = await bcrypt.hash(tempPassword, 10)
      user.password = hashedPassword
      await user.save()

      res.json({
         message: '임시 비밀번호가 발급되었습니다.',
         tempPassword,
      })
   } catch (error) {
      error.status = 500
      error.message = '임시 비밀번호를 발급하는 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
