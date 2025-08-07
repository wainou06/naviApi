const express = require('express')
const router = express.Router()
const Keyword = require('../models/keyword') // 모델 경로 확인
const { isLoggedIn, isManager } = require('./middlewares') // 미들웨어 경로 확인

/**
 * @swagger
 * tags:
 * name: Keyword
 * description: 키워드 관리 API
 */

/**
 * @swagger
 * /keyword/:
 * post:
 * summary: 새 키워드 등록
 * tags: [Keyword]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - name
 * properties:
 * name:
 * type: string
 * description: 등록할 키워드 이름
 * example: '새로운 키워드'
 * responses:
 * 200:
 * description: 키워드 등록 성공
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * keyword:
 * type: object
 * properties:
 * id:
 * type: string
 * description: 등록된 키워드의 ID
 * example: '123e4567-e89b-12d3-a456-426614174000'
 * name:
 * type: string
 * description: 등록된 키워드 이름
 * example: '새로운 키워드'
 * message:
 * type: string
 * example: '키워드가 성공적으로 등록되었습니다.'
 * 400:
 * description: 요청 본문이 비어있음
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '파일 업로드에 실패했습니다.'
 * 404:
 * description: 이미 존재하는 키워드 (코드에서는 404로 처리되나, 의미상 409가 더 적절)
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '이미 존재하는 키워드 입니다.'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '키워드 등록 중 오류가 발생했습니다.'
 */
router.post('/', isLoggedIn, isManager, async (req, res, next) => {
   try {
      console.log('formData:', req.body)

      if (!req.body || !req.body.name) {
         // req.body.name 확인 추가
         const error = new Error('키워드 이름이 필요합니다.') // 메시지 수정
         error.status = 400
         return next(error)
      }

      const exKeyword = await Keyword.findOne({
         where: { name: req.body.name },
      })

      if (exKeyword) {
         const error = new Error('이미 존재하는 키워드 입니다.')
         error.status = 404 // 스웨거 문서와 일치하도록 404 유지 (의미상 409가 더 적절)
         return next(error)
      }

      const keyword = await Keyword.create({
         // 'keyword' 변수 선언 누락 수정
         name: req.body.name,
      })

      res.status(200).json({
         // 스웨거 문서와 일치하도록 200 유지 (생성 시 201이 더 적절)
         success: true,
         keyword: {
            // id 속성 추가
            id: keyword.id,
            name: keyword.name,
         },
         message: '키워드가 성공적으로 등록되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = `키워드 등록 중 오류가 발생했습니다. ${error.message}` // 에러 메시지 개선
      next(error)
   }
})

/**
 * @swagger
 * /keyword/{id}:
 * put:
 * summary: 키워드 수정
 * tags: [Keyword]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: 수정할 키워드의 ID
 * example: '123e4567-e89b-12d3-a456-426614174000'
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required:
 * - name
 * properties:
 * name:
 * type: string
 * description: 새로운 키워드 이름
 * example: '수정된 키워드'
 * responses:
 * 200:
 * description: 키워드 수정 성공
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * keyword:
 * type: object
 * properties:
 * id:
 * type: string
 * description: 수정된 키워드의 ID
 * example: '123e4567-e89b-12d3-a456-426614174000'
 * name:
 * type: string
 * description: 수정된 키워드 이름
 * example: '수정된 키워드'
 * message:
 * type: string
 * example: '키워드가 성공적으로 수정되었습니다.'
 * 404:
 * description: 키워드를 찾을 수 없음
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '키워드를 찾을 수 없습니다.'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '키워드 수정 중 오류가 발생했습니다.'
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

      // 요청 본문에 name이 없는 경우 처리
      if (!req.body || !req.body.name) {
         const error = new Error('새로운 키워드 이름이 필요합니다.')
         error.status = 400
         return next(error)
      }

      await keyword.update({
         name: req.body.name,
      })

      // 업데이트 후 다시 조회할 때 id로 조회해야 합니다. name으로 조회하면 안됩니다.
      const updatedKeyword = await Keyword.findOne({
         where: { id: req.params.id }, // id로 조회하도록 수정
      })

      res.status(200).json({
         success: true,
         keyword: updatedKeyword,
         message: '키워드가 성공적으로 수정되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = `키워드 수정 중 오류가 발생했습니다. ${error.message}` // 에러 메시지 개선
      next(error)
   }
})

/**
 * @swagger
 * /keyword/:
 * get:
 * summary: 전체 키워드 목록 조회
 * tags: [Keyword]
 * security:
 * - bearerAuth: []
 * responses:
 * 200:
 * description: 전체 키워드 리스트 조회 성공
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * example: true
 * keywords:
 * type: array
 * items:
 * type: object
 * properties:
 * id:
 * type: string
 * description: 키워드 ID
 * example: '123e4567-e89b-12d3-a456-426614174000'
 * name:
 * type: string
 * description: 키워드 이름
 * example: '예시 키워드'
 * createdAt:
 * type: string
 * format: date-time
 * description: 생성일시
 * updatedAt:
 * type: string
 * format: date-time
 * description: 수정일시
 * message:
 * type: string
 * example: '전체 키워드 리스트를 성공적으로 불러왔습니다.'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '키워드 확인 중 오류가 발생했습니다.'
 */
router.get('/', isLoggedIn, async (req, res, next) => {
   try {
      // count는 현재 사용되지 않으므로 제거하거나 필요에 따라 활용
      // const count = await Keyword.count();
      const keywords = await Keyword.findAll({
         // order: [['createdAt', 'DESC']], // 필요시 주석 해제
      })

      console.log('keywords: ', keywords)

      res.status(200).json({
         success: true,
         keywords,
         message: '전체 키워드 리스트를 성공적으로 불러왔습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = `키워드 확인 중 오류가 발생했습니다. ${error.message}` // 에러 메시지 개선
      next(error)
   }
})

/**
 * @swagger
 * /keyword/{id}:
 * delete:
 * summary: 키워드 삭제
 * tags: [Keyword]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * description: 삭제할 키워드의 ID
 * example: '123e4567-e89b-12d3-a456-426614174000'
 * responses:
 * 200:
 * description: 키워드 삭제 성공
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
 * example: '키워드가 성공적으로 삭제되었습니다.'
 * 404:
 * description: 키워드를 찾을 수 없음
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '키워드를 찾을 수 없습니다.'
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * message:
 * type: string
 * example: '키워드 삭제 중 오류가 발생했습니다.'
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
      error.message = `키워드 삭제 중 오류가 발생했습니다. ${error.message}` // 에러 메시지 개선
      next(error)
   }
})

module.exports = router
