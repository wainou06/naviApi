const express = require('express')
const router = express.Router()
const Keyword = require('../models/keyword')
const { isLoggedIn, isManager, isSuspended } = require('./middlewares')

/**
 * @swagger
 * tags:
 * - name: User Management
 * description: 사용자 관리 API
 */

//유저 조회
/**
 * @swagger
 * /managerUser/{page}:
 * get:
 * summary: 전체 사용자 목록 조회 (페이지네이션)
 * tags: [User Management]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: page
 * required: true
 * schema:
 * type: integer
 * minimum: 1
 * description: 조회할 페이지 번호
 * responses:
 * 200:
 * description: 전체 유저 목록을 성공적으로 불러왔습니다.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * users:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: integer
 * name:
 * type: string
 * nick:
 * type: string
 * email:
 * type: string
 * address:
 * type: string
 * phone:
 * type: string
 * suspend:
 * type: string
 * nullable: true
 * pagination:
 * type: object
 * properties:
 * totalUsers:
 * type: integer
 * currentPage:
 * type: integer
 * pageCount:
 * type: integer
 * limit:
 * type: integer
 * 401:
 * description: 권한 없음 (로그인이 필요하거나 관리자 권한이 없음)
 * 500:
 * description: 서버 오류
 */

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

//계정 삭제
/**
 * @swagger
 * /managerUserDelete/{id}:
 * delete:
 * summary: 특정 사용자 계정 삭제
 * tags: [User Management]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: 삭제할 사용자의 ID
 * responses:
 * 200:
 * description: 사용자 계정이 성공적으로 삭제되었습니다.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * message:
 * type: string
 * example: "사용자 한 명이 사라졌어요."
 * 401:
 * description: 권한 없음 (로그인이 필요하거나 관리자 권한이 없음)
 * 404:
 * description: 사용자를 찾을 수 없음
 * 500:
 * description: 서버 오류
 */

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

      const exKeyword = await Keyword.findOne({
         where: { name: req.body.name },
      })

      if (exKeyword) {
         const error = new Error('이미 키워드가 존재합니다.')
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

//계정 정지
/**
 * @swagger
 * /managerUserSuspend/{id}:
 * put:
 * summary: 특정 사용자 계정 정지
 * tags: [User Management]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: 정지시킬 사용자의 ID
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * date:
 * type: string
 * format: date-time
 * description: 계정이 정지될 만료 날짜 및 시간 (ISO 8601 형식)
 * example: "2025-08-25T07:05:52Z"
 * responses:
 * 200:
 * description: 계정이 성공적으로 정지되었습니다.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * user:
 * type: object
 * properties:
 * id:
 * type: integer
 * name:
 * type: string
 * suspend:
 * type: string
 * format: date-time
 * nullable: true
 * message:
 * type: string
 * example: "계정이 수정되었습니다."
 * 401:
 * description: 권한 없음 (로그인이 필요하거나 관리자 권한이 없음)
 * 404:
 * description: 사용자를 찾을 수 없음
 * 500:
 * description: 서버 오류
 */

router.get('/', isLoggedIn, async (req, res, next) => {
   try {
      const keywords = await Keyword.findAll({})

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

// 비밀번호 변경
/**
 * @swagger
 * /userPasswordEdit:
 * put:
 * summary: 로그인한 사용자의 비밀번호 변경
 * tags: [User Management]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - id
 * - currentPassword
 * - newPassword
 * properties:
 * id:
 * type: integer
 * description: 변경할 사용자의 ID (권장하지 않음, 대신 세션 ID 사용)
 * currentPassword:
 * type: string
 * description: 현재 비밀번호
 * newPassword:
 * type: string
 * description: 새로운 비밀번호
 * responses:
 * 200:
 * description: 비밀번호가 성공적으로 수정되었습니다.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * user:
 * type: integer
 * description: 변경된 사용자의 ID
 * message:
 * type: string
 * example: "비밀번호가 수정되었습니다."
 * 401:
 * description: 권한 없음 (로그인이 필요하거나 현재 비밀번호가 일치하지 않음)
 * 404:
 * description: 사용자를 찾을 수 없거나 비밀번호가 일치하지 않습니다.
 * 500:
 * description: 서버 오류
 */

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
