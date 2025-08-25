const express = require('express')
const multer = require('multer')
const path = require('path')
const { Item, Img, ItemKeyword, Keyword, User } = require('../models')
const { Op } = require('sequelize')
const { isLoggedIn } = require('./middlewares')
const fs = require('fs')
const router = express.Router()

const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, 'uploads/')
   },
   filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
   },
})

const upload = multer({
   storage: storage,
   limits: {
      fileSize: 5 * 1024 * 1024,
   },
   fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
         cb(null, true)
      } else {
         cb(new Error('이미지 파일만 업로드 가능합니다.'), false)
      }
   },
})

/**
 * @swagger
 * tags:
 *   name: Items
 */

/**
 * @swagger
 * /items/list:
 *   get:
 *     summary: 상품 목록 조회
 *     description: 페이징, 검색, 필터링이 가능한 상품 목록을 조회합니다.
 *     tags: [Items]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 현재 페이지 (기본 1)
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 페이지당 상품 수 (기본 10)
 *         example: 10
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: 상품명 검색 키워드
 *         example: "노트북"
 *       - in: query
 *         name: searchCategory
 *         schema:
 *           type: string
 *         description: 검색 카테고리 (현재 사용되지 않음)
 *         example: "itemNm"
 *       - in: query
 *         name: sellCategory
 *         schema:
 *           type: string
 *           enum: [SELL, SOLD_OUT, RESERVATION]
 *         description: 판매 상태 필터
 *         example: "SELL"
 *     responses:
 *       200:
 *         description: 상품 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Item'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
//상품 목록 조회 (검색, 페이징 기능) /items/list
router.get('/list', async (req, res, next) => {
   try {
      const { page = 1, limit = 10, searchTerm = '', sellCategory = '' } = req.query

      const offset = (page - 1) * limit

      let whereClause = {}

      if (searchTerm) {
         whereClause.itemNm = {
            [Op.like]: `%${searchTerm}%`,
         }
      }

      if (sellCategory && sellCategory !== '') {
         whereClause.itemSellStatus = sellCategory
      }

      const { count, rows } = await Item.findAndCountAll({
         where: whereClause,
         include: [
            {
               model: Img,
               as: 'imgs',
               required: false,
            },
            {
               model: ItemKeyword,
               required: false,
               include: [
                  {
                     model: Keyword,
                     required: false,
                  },
               ],
            },
         ],
         limit: parseInt(limit),
         offset: parseInt(offset),
         distinct: true,
      })

      const totalPages = Math.ceil(count / limit)

      res.status(200).json({
         success: true,
         data: {
            items: rows,
            pagination: {
               totalItems: count,
               totalPages,
               currentPage: parseInt(page),
               limit: parseInt(limit),
            },
         },
      })
   } catch (error) {
      console.error('상품 목록 조회 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /items/detail/{id}:
 *   get:
 *     summary: 상품 상세 조회
 *     description: 특정 상품의 상세 정보를 조회합니다. 이미지, 키워드, 주문 정보가 포함됩니다.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 상품 ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 상품 상세 정보 반환
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Item'
 *       404:
 *         description: 상품을 찾을 수 없습니다.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "상품을 찾을 수 없습니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 상품 상세 조회 /items/detail/:id
router.get('/detail/:id', async (req, res, next) => {
   try {
      const { id } = req.params

      const item = await Item.findByPk(id, {
         include: [
            {
               model: Img,
               as: 'imgs',
               required: false,
            },
            {
               model: ItemKeyword,
               required: false,
               include: [
                  {
                     model: Keyword,
                     required: false,
                  },
               ],
            },
         ],
      })

      if (!item) {
         return res.status(404).json({
            success: false,
            message: '상품을 찾을 수 없습니다.',
         })
      }

      res.status(200).json({
         success: true,
         data: item,
      })
   } catch (error) {
      console.error('상품 상세 조회 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /items:
 *   post:
 *     summary: 상품 등록
 *     description: 새로운 상품을 등록합니다. 이미지와 키워드를 함께 등록할 수 있습니다.
 *     tags: [Items]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *               - content
 *             properties:
 *               name:
 *                 type: string
 *                 description: 상품명
 *                 example: "맥북 프로 14인치"
 *               price:
 *                 type: integer
 *                 description: 상품 가격
 *                 minimum: 0
 *                 example: 1500000
 *               stock:
 *                 type: integer
 *                 description: 재고 수량 (현재 사용되지 않음)
 *                 example: 10
 *               content:
 *                 type: string
 *                 description: 상품 상세 설명
 *                 example: "2023년형 맥북 프로 14인치, M2 Pro 칩셋"
 *               status:
 *                 type: string
 *                 enum: [sell, sold_out, reservation, SELL, SOLD_OUT, RESERVATION]
 *                 description: 판매 상태
 *                 example: "sell"
 *               keywords:
 *                 type: string
 *                 description: 쉼표로 구분된 키워드
 *                 example: "맥북, 노트북, 애플"
 *               img:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 상품 이미지 파일들 (최대 5개)
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: 상품 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Item'
 *             example:
 *               success: true
 *               message: "상품이 성공적으로 등록되었습니다."
 *               data:
 *                 id: 1
 *                 itemNm: "맥북 프로 14인치"
 *                 price: 1500000
 *                 itemSellStatus: "SELL"
 *       400:
 *         description: 필수 항목 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "상품명, 가격, 상품내용은 필수 항목입니다."
 *       401:
 *         description: 인증되지 않은 사용자
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 상품 등록 items/create
router.post('/', isLoggedIn, upload.array('img', 5), async (req, res, next) => {
   try {
      const { name, price, stock, content, status, keywords } = req.body

      if (!name || !price || !content) {
         return res.status(400).json({
            success: false,
            message: '상품명, 가격, 상품내용은 필수 항목입니다.',
         })
      }

      if (!status) {
         var mappedStatus = 'SELL'
      } else {
         const cleanStatus = status.toString().trim()

         const statusMapping = {
            sell: 'SELL',
            sold_out: 'SOLD_OUT',
            soldout: 'SOLD_OUT',
            reservation: 'RESERVATION',
            SELL: 'SELL',
            SOLD_OUT: 'SOLD_OUT',
            RESERVATION: 'RESERVATION',
         }

         mappedStatus = statusMapping[cleanStatus] || 'SELL'
      }

      const newItem = await Item.create({
         itemNm: name,
         price: parseInt(price),
         itemSellStatus: mappedStatus,
         itemDetail: content,
         userId: req.user.id,
      })

      if (req.files && req.files.length > 0) {
         const imagePromises = req.files.map((file, index) => {
            return Img.create({
               originName: file.originalname,
               imgUrl: `/uploads/${file.filename}`,
               field: index === 0 ? 'Y' : 'N',
               itemId: newItem.id,
            })
         })
         await Promise.all(imagePromises)
      }

      if (keywords) {
         const keywordArray = keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k)

         for (const keywordName of keywordArray) {
            const [keyword] = await Keyword.findOrCreate({
               where: { name: keywordName },
               defaults: { name: keywordName },
            })

            await ItemKeyword.create({
               itemId: newItem.id,
               keywordId: keyword.id,
               startAt: new Date(),
               endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            })
         }
      }

      const createdItem = await Item.findByPk(newItem.id, {
         include: [
            {
               model: Img,
               as: 'imgs',
               required: false,
            },
            {
               model: ItemKeyword,
               required: false,
               include: [
                  {
                     model: Keyword,
                     required: false,
                  },
               ],
            },
         ],
      })

      res.status(201).json({
         success: true,
         message: '상품이 성공적으로 등록되었습니다.',
         data: createdItem,
      })
   } catch (error) {
      console.error('상품 등록 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /items/edit/{id}:
 *   put:
 *     summary: 상품 수정
 *     description: 기존 상품의 정보를 수정합니다. 이미지 추가/삭제와 키워드 변경이 가능합니다.
 *     tags: [Items]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 수정할 상품 ID
 *         example: 1
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 상품명
 *                 example: "수정된 맥북 프로 14인치"
 *               price:
 *                 type: integer
 *                 description: 상품 가격
 *                 minimum: 0
 *                 example: 1400000
 *               stock:
 *                 type: integer
 *                 description: 재고 수량 (현재 사용되지 않음)
 *                 example: 8
 *               content:
 *                 type: string
 *                 description: 상품 상세 설명
 *                 example: "수정된 2023년형 맥북 프로 14인치"
 *               status:
 *                 type: string
 *                 enum: [sell, sold_out, reservation, SELL, SOLD_OUT, RESERVATION]
 *                 description: 판매 상태
 *                 example: "sell"
 *               keywords:
 *                 type: string
 *                 description: 쉼표로 구분된 키워드
 *                 example: "맥북, 노트북, 애플, 수정됨"
 *               deleteImages:
 *                 type: string
 *                 description: 삭제할 이미지 ID 배열 (JSON 문자열)
 *                 example: "[1, 2]"
 *               img:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 새로 추가할 이미지 파일들 (최대 5개)
 *     responses:
 *       200:
 *         description: 상품 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Item'
 *             example:
 *               success: true
 *               message: "상품이 성공적으로 수정되었습니다."
 *       404:
 *         description: 상품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "상품을 찾을 수 없습니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 상품 수정 /items/edit/:id
router.put('/edit/:id', upload.array('img', 5), async (req, res, next) => {
   try {
      const { id } = req.params
      const { name, price, stock, content, status, keywords, deleteImages } = req.body

      const item = await Item.findByPk(id)
      if (!item) {
         return res.status(404).json({
            success: false,
            message: '상품을 찾을 수 없습니다.',
         })
      }

      const updateData = {}
      if (name !== undefined) updateData.itemNm = name
      if (price !== undefined) updateData.price = parseInt(price)
      if (status !== undefined) {
         const statusMapping = {
            sell: 'SELL',
            sold_out: 'SOLD_OUT',
            reservation: 'RESERVATION',
         }
         updateData.itemSellStatus = statusMapping[status] || status
      }
      if (content !== undefined) updateData.itemDetail = content

      await item.update(updateData)

      if (deleteImages && deleteImages.length > 0) {
         const imageIdsToDelete = JSON.parse(deleteImages)

         const imagesToDelete = await Img.findAll({
            where: {
               id: { [Op.in]: imageIdsToDelete },
            },
         })

         imagesToDelete.forEach((image) => {
            const filePath = path.join(__dirname, '..', 'uploads', image.imgUrl.replace('/uploads/', ''))
            fs.unlinkSync(filePath)
         })

         await Img.destroy({
            where: {
               id: { [Op.in]: imageIdsToDelete },
            },
         })
      }

      if (req.files && req.files.length > 0) {
         const existingImageCount = await Img.count({
            where: { itemId: item.id },
         })

         const imagePromises = req.files.map((file, index) => {
            return Img.create({
               originName: file.originalname,
               imgUrl: `/uploads/${file.filename}`,
               field: existingImageCount === 0 && index === 0 ? 'Y' : 'N',
               itemId: item.id,
            })
         })
         await Promise.all(imagePromises)
      }

      if (keywords !== undefined) {
         await ItemKeyword.destroy({
            where: { itemId: item.id },
         })

         if (keywords) {
            const keywordArray = keywords
               .split(',')
               .map((k) => k.trim())
               .filter((k) => k)

            for (const keywordName of keywordArray) {
               const [keyword] = await Keyword.findOrCreate({
                  where: { name: keywordName },
                  defaults: { name: keywordName },
               })

               await ItemKeyword.create({
                  itemId: item.id,
                  keywordId: keyword.id,
                  startAt: new Date(),
                  endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
               })
            }
         }
      }

      const updatedItem = await Item.findByPk(id, {
         include: [
            {
               model: Img,
               as: 'imgs',
               required: false,
            },
            {
               model: ItemKeyword,
               required: false,
               include: [
                  {
                     model: Keyword,
                     required: false,
                  },
               ],
            },
         ],
      })

      res.status(200).json({
         success: true,
         message: '상품이 성공적으로 수정되었습니다.',
         data: updatedItem,
      })
   } catch (error) {
      console.error('상품 수정 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /items/{id}:
 *   delete:
 *     summary: 상품 삭제
 *     description: 특정 상품을 삭제합니다. 관련된 이미지와 키워드도 함께 삭제됩니다.
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 삭제할 상품 ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 상품 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "상품이 성공적으로 삭제되었습니다."
 *       404:
 *         description: 상품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "상품을 찾을 수 없습니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 상품 삭제 /items/:id
router.delete('/:id', async (req, res, next) => {
   try {
      const { id } = req.params

      const item = await Item.findByPk(id)
      if (!item) {
         return res.status(404).json({
            success: false,
            message: '상품을 찾을 수 없습니다.',
         })
      }

      await ItemKeyword.destroy({
         where: { itemId: id },
      })

      await Img.destroy({
         where: { itemId: id },
      })

      await item.destroy()

      res.status(200).json({
         success: true,
         message: '상품이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      console.error('상품 삭제 오류:', error)
      next(error)
   }
})

module.exports = router
