const express = require('express')
const router = express.Router()
const Keyword = require('../models/keyword')
const ItemKeyword = require('../models/itemKeyword')
const Item = require('../models/items')
const { isLoggedIn, isManager } = require('./middlewares')

/**
 * @swagger
 * /keywords:
 * post:
 * summary: 새 키워드 등록
 * description: 관리자 권한으로 새로운 키워드를 등록합니다.
 * tags:
 * - Keywords
 * security:
 * - BearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/KeywordRequest'
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
 * $ref: '#/components/schemas/Keyword'
 * message:
 * type: string
 * example: "키워드가 성공적으로 등록되었습니다."
 * 400:
 * description: 요청 본문 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 * 409:
 * description: 이미 존재하는 키워드
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 * 401:
 * description: 권한 없음
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
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

      const keyword = await Keyword.create({
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

/**
 * @swagger
 * /keywords/{id}:
 * put:
 * summary: 키워드 수정
 * description: 특정 키워드의 이름을 수정합니다.
 * tags:
 * - Keywords
 * security:
 * - BearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: 수정할 키워드 ID
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/KeywordRequest'
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
 * $ref: '#/components/schemas/Keyword'
 * message:
 * type: string
 * example: "키워드가 성공적으로 수정되었습니다."
 * 404:
 * description: 키워드를 찾을 수 없음
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 * 409:
 * description: 이미 존재하는 키워드 이름
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 * 401:
 * description: 권한 없음
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
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

/**
 * @swagger
 * /keywords:
 * get:
 * summary: 전체 키워드 조회
 * description: 모든 키워드 리스트를 조회합니다.
 * tags:
 * - Keywords
 * security:
 * - BearerAuth: []
 * responses:
 * 200:
 * description: 키워드 리스트 조회 성공
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
 * $ref: '#/components/schemas/Keyword'
 * message:
 * type: string
 * example: "전체 키워드 리스트를 성공적으로 불러왔습니다."
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 */

router.get('/', isLoggedIn, async (req, res, next) => {
   try {
      const keywords = await Keyword.findAll({})

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

/**
 * @swagger
 * /keywords/{id}:
 * delete:
 * summary: 키워드 삭제
 * description: 특정 키워드를 삭제합니다.
 * tags:
 * - Keywords
 * security:
 * - BearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: 삭제할 키워드 ID
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
 * example: "키워드가 성공적으로 삭제되었습니다."
 * 404:
 * description: 키워드를 찾을 수 없음
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 * 401:
 * description: 권한 없음
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
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

/**
 * @swagger
 * /keywords/keywordItems/{id}:
 * get:
 * summary: 키워드에 연결된 아이템 조회
 * description: 특정 키워드에 연결된 아이템과 렌탈 아이템을 조회합니다.
 * tags:
 * - Keywords
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: integer
 * description: 아이템을 조회할 키워드 ID
 * responses:
 * 200:
 * description: 키워드 아이템 조회 성공
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
 * example: "키워드 아이템 조회가 성공했습니다."
 * itemList:
 * type: array
 * description: 일반 아이템 리스트
 * items:
 * type: object
 * rentalItemList:
 * type: array
 * description: 렌탈 아이템 리스트
 * items:
 * type: object
 * 500:
 * description: 서버 오류
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 */

router.get('/keywordItems/:id', async (req, res, next) => {
   try {
      let itemList = []
      let rentalItemList = []

      const keywordItemIds = await ItemKeyword.findAll({
         where: { keywordId: req.params.id },
      })

      for (let i = 0; i < keywordItemIds.length; i++) {
         if (keywordItemIds[i].itemId) itemList.push(keywordItemIds[i])
         else rentalItemList.push(keywordItemIds[i])
      }

      res.status(200).json({
         success: true,
         message: '키워드 아이템 조회가 성공했습니다.',
         itemList,
         rentalItemList,
      })
   } catch (error) {
      error.status = 500
      error.message = `키워드 아이템 조회 중 오류가 발생했습니다. ${error}`
      next(error)
   }
})

module.exports = router
