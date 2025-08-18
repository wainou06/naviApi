const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Op } = require('sequelize')
const { RentalItem, RentalImg, Keyword, ItemKeyword, sequelize } = require('../models')
const { isLoggedIn } = require('./middlewares') // 미들웨어 추가
const router = express.Router()

// uploads 폴더가 없을 경우 새로 생성
try {
   fs.readdirSync('uploads') //해당 폴더가 있는지 확인
} catch (error) {
   console.log('uploads 폴더가 없어 uploads 폴더를 생성합니다.')
   fs.mkdirSync('uploads') //폴더 생성
}

// 이미지 업로드를 위한 multer 설정 (파일 타입 검증 추가)
const upload = multer({
   // 저장할 위치와 파일명 지정
   storage: multer.diskStorage({
      destination(req, file, cb) {
         cb(null, 'uploads/') // uploads폴더에 저장
      },
      filename(req, file, cb) {
         const decodedFileName = decodeURIComponent(file.originalname) //파일명 디코딩(한글 파일명 깨짐 방지) => 제주도.jpg
         const ext = path.extname(decodedFileName) //확장자 추출
         const basename = path.basename(decodedFileName, ext) //확장자 제거한 파일명 추출

         // 파일명 설정: 기존이름 + 업로드 날짜시간 + 확장자
         // dog.jpg
         // ex) dog + 1231342432443 + .jpg
         cb(null, basename + Date.now() + ext)
      },
   }),
   // 파일의 크기 제한
   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB로 제한
   // 파일 타입 검증 추가
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
 * /rental:
 *   post:
 *     summary: 렌탈 상품 등록
 *     description: 새로운 렌탈 상품을 등록합니다. 이미지와 키워드를 함께 등록할 수 있습니다.
 *     tags: [RentalItems]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - rentalItemNm
 *               - oneDayPrice
 *               - quantity
 *             properties:
 *               rentalItemNm:
 *                 type: string
 *                 description: 렌탈 상품명
 *                 example: "캠핑 텐트"
 *               oneDayPrice:
 *                 type: number
 *                 description: 일일 렌탈 가격
 *                 example: 30000
 *               quantity:
 *                 type: integer
 *                 description: 재고 수량
 *                 example: 5
 *               rentalDetail:
 *                 type: string
 *                 description: 렌탈 상품 상세 설명
 *                 example: "4인용 캠핑 텐트입니다."
 *               rentalStatus:
 *                 type: string
 *                 enum: [Y, N]
 *                 description: 렌탈 상태
 *                 example: "Y"
 *               keywords:
 *                 type: string
 *                 description: 쉼표로 구분된 키워드
 *                 example: "캠핑, 텐트, 아웃도어"
 *               img:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 상품 이미지 파일들
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: 렌탈 상품 등록 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         rentalItem:
 *                           $ref: '#/components/schemas/RentalItem'
 *                         images:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/RentalImg'
 *       400:
 *         description: 필수 항목 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "상품명, 일일 렌탈가격, 재고는 필수 입력 항목입니다."
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
// 렌탈상품 등록 /rental/create
router.post('/', isLoggedIn, upload.array('img'), async (req, res, next) => {
   try {
      const { rentalItemNm, oneDayPrice, quantity, rentalDetail, rentalStatus = 'Y', keywords } = req.body

      // 필수 필드 검증
      if (!rentalItemNm || !oneDayPrice || quantity === undefined) {
         return res.status(400).json({
            success: false,
            message: '상품명, 일일 렌탈가격, 재고는 필수 입력 항목입니다.',
         })
      }

      const rentalItem = await RentalItem.create({
         rentalItemNm,
         oneDayPrice,
         quantity,
         rentalDetail,
         rentalStatus,
         userId: req.user.id,
      })

      // 이미지(RentalImg) insert
      let images = []
      if (req.files && req.files.length > 0) {
         const imageData = req.files.map((file, index) => ({
            imgUrl: `/uploads/${file.filename}`,
            alt: rentalItemNm,
            originName: file.originalname,
            rentalItemId: rentalItem.id,
            field: index === 0 ? 'Y' : 'N',
         }))

         images = await RentalImg.bulkCreate(imageData)
      }

      // 키워드 등록
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
               rentalItemId: rentalItem.id,
               keywordId: keyword.id,
               startAt: new Date(),
               endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            })
         }
      }

      res.status(201).json({
         success: true,
         message: '렌탈상품이 성공적으로 등록되었습니다.',
         data: {
            rentalItem,
            images,
         },
      })
   } catch (error) {
      console.error('렌탈상품 등록 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /rental/list:
 *   get:
 *     summary: 렌탈 상품 목록 조회
 *     description: 페이징, 검색, 필터링이 가능한 렌탈 상품 목록을 조회합니다.
 *     tags: [RentalItems]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 페이지 번호 (기본값 1)
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: 페이지당 상품 수 (기본값 5)
 *         example: 5
 *       - in: query
 *         name: keyword
 *         schema:
 *           type: string
 *         description: 상품명 또는 상세설명에서 검색할 키워드
 *         example: "텐트"
 *       - in: query
 *         name: searchCategory
 *         schema:
 *           type: string
 *           enum: [rentalItemNm, rentalDetail]
 *         description: 검색 카테고리
 *         example: "rentalItemNm"
 *       - in: query
 *         name: rentalStatus
 *         schema:
 *           type: string
 *           enum: [Y, N]
 *         description: 렌탈 상태 필터
 *         example: "Y"
 *     responses:
 *       200:
 *         description: 렌탈 상품 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         rentalItems:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/RentalItem'
 *                         pagination:
 *                           $ref: '#/components/schemas/Pagination'
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// GET /rental/list - 상품 목록 조회
router.get('/list', async (req, res, next) => {
   try {
      const page = parseInt(req.query.page, 10) || 1
      const limit = parseInt(req.query.limit, 10) || 5
      const offset = (page - 1) * limit

      const searchTerm = req.query.keyword || ''
      const searchCategory = req.query.searchCategory || 'rentalItemNm'
      const sellCategory = req.query.rentalStatus

      const whereClause = {
         ...(searchTerm && {
            [Op.or]: [{ rentalItemNm: { [Op.like]: `%${searchTerm}%` } }, { rentalDetail: { [Op.like]: `%${searchTerm}%` } }],
         }),
         ...(sellCategory && {
            rentalStatus: sellCategory,
         }),
      }

      const count = await RentalItem.count({
         where: whereClause,
      })

      const rentalItems = await RentalItem.findAll({
         where: whereClause,
         limit,
         offset,
         order: [['createdAt', 'DESC']],
         include: [
            {
               model: RentalImg,
               as: 'rentalImgs',
               attributes: ['id', 'imgUrl'],
            },
            {
               model: ItemKeyword,
               include: [
                  {
                     model: Keyword,
                     attributes: ['id', 'name'],
                     startAt: new Date(),
                     endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                  },
               ],
               attributes: [],
            },
         ],
      })

      res.status(200).json({
         success: true,
         message: '렌탈상품 목록 조회 성공',
         data: {
            rentalItems,
            pagination: {
               totalItems: count,
               totalPages: Math.ceil(count / limit),
               currentPage: page,
               limit,
            },
         },
      })
   } catch (error) {
      console.error('렌탈상품 목록 조회 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /rental/{id}:
 *   delete:
 *     summary: 렌탈 상품 삭제
 *     description: 특정 렌탈 상품을 삭제합니다. 관련된 이미지와 키워드도 함께 삭제됩니다.
 *     tags: [RentalItems]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 삭제할 렌탈 상품 ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 렌탈 상품 삭제 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               message: "렌탈상품이 성공적으로 삭제되었습니다."
 *       404:
 *         description: 렌탈 상품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "렌탈상품을 찾을 수 없습니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// DELETE 렌탈상품 삭제 /rental/:id
router.delete('/:id', async (req, res, next) => {
   try {
      const id = req.params.id

      const rentalItem = await RentalItem.findByPk(id)

      if (!rentalItem) {
         return res.status(404).json({
            success: false,
            message: '렌탈상품을 찾을 수 없습니다.',
         })
      }

      await ItemKeyword.destroy({ where: { rentalItemId: id } })
      await RentalImg.destroy({ where: { rentalItemId: id } })

      await rentalItem.destroy()

      res.status(200).json({
         success: true,
         message: '렌탈상품이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      console.error('렌탈상품 삭제 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /rental/detail/{id}:
 *   get:
 *     summary: 렌탈 상품 상세 조회
 *     description: 특정 렌탈 상품의 상세 정보를 조회합니다.
 *     tags: [RentalItems]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 렌탈 상품 ID
 *         example: 1
 *     responses:
 *       200:
 *         description: 렌탈 상품 상세 정보
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RentalItem'
 *       404:
 *         description: 해당 렌탈 상품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "해당 렌탈상품을 찾을 수 없습니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 특정 렌탈상품 불러오기 /rental/detail/:id
router.get('/detail/:id', async (req, res, next) => {
   try {
      const id = req.params.id

      const rentalItem = await RentalItem.findOne({
         where: { id },
         include: [
            {
               model: RentalImg,
               as: 'rentalImgs',
               attributes: ['id', 'imgUrl', 'originName', 'field'],
            },
            {
               model: ItemKeyword,
               required: false,
               paranoid: false,
               include: [
                  {
                     model: Keyword,
                     required: false,
                     paranoid: false,
                     attributes: ['id', 'name'],
                  },
               ],
            },
         ],
      })

      if (!rentalItem) {
         return res.status(404).json({
            success: false,
            message: '해당 렌탈상품을 찾을 수 없습니다.',
         })
      }

      res.status(200).json({
         success: true,
         message: '렌탈상품 조회 성공',
         data: rentalItem,
      })
   } catch (error) {
      console.error('렌탈상품 상세 조회 오류:', error)
      next(error)
   }
})
/**
 * @swagger
 * /rental/edit/{id}:
 *   put:
 *     summary: 렌탈 상품 수정
 *     description: 기존 렌탈 상품의 정보를 수정합니다. 이미지 추가/삭제와 키워드 변경이 가능합니다.
 *     tags: [RentalItems]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: 수정할 렌탈 상품 ID
 *         example: 1
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               rentalItemNm:
 *                 type: string
 *                 description: 렌탈 상품명
 *                 example: "수정된 캠핑 텐트"
 *               oneDayPrice:
 *                 type: number
 *                 description: 일일 렌탈 가격
 *                 example: 35000
 *               quantity:
 *                 type: integer
 *                 description: 재고 수량
 *                 example: 3
 *               rentalDetail:
 *                 type: string
 *                 description: 렌탈 상품 상세 설명
 *                 example: "수정된 4인용 캠핑 텐트입니다."
 *               rentalStatus:
 *                 type: string
 *                 enum: [Y, N]
 *                 description: 렌탈 상태
 *                 example: "Y"
 *               keywords:
 *                 type: string
 *                 description: 쉼표로 구분된 키워드
 *                 example: "캠핑, 텐트, 아웃도어, 수정됨"
 *               deleteImages:
 *                 type: string
 *                 description: 삭제할 이미지 ID 배열 (JSON 형식)
 *                 example: "[1, 2]"
 *               img:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 새로 추가할 이미지 파일들
 *     responses:
 *       200:
 *         description: 렌탈 상품 수정 성공
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/RentalItem'
 *       404:
 *         description: 해당 렌탈 상품을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               success: false
 *               message: "해당 렌탈상품을 찾을 수 없습니다."
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// 렌탈 상품 수정 /rental/edit/:id
router.put('/edit/:id', upload.array('img'), async (req, res, next) => {
   try {
      const id = req.params.id
      const { rentalItemNm, oneDayPrice, quantity, rentalDetail, rentalStatus, keywords, deleteImages } = req.body

      const rentalItem = await RentalItem.findByPk(id)

      if (!rentalItem) {
         return res.status(404).json({
            success: false,
            message: '해당 렌탈상품을 찾을 수 없습니다.',
         })
      }

      // 렌탈상품 정보 업데이트
      const updateData = {}
      if (rentalItemNm !== undefined) updateData.rentalItemNm = rentalItemNm
      if (oneDayPrice !== undefined) updateData.oneDayPrice = oneDayPrice
      if (quantity !== undefined) updateData.quantity = quantity
      if (rentalDetail !== undefined) updateData.rentalDetail = rentalDetail
      if (rentalStatus !== undefined) updateData.rentalStatus = rentalStatus

      await rentalItem.update(updateData)

      // 삭제할 이미지가 있을 경우
      if (deleteImages) {
         try {
            let imageIdsToDelete = []
            if (typeof deleteImages === 'string') {
               imageIdsToDelete = JSON.parse(deleteImages)
            } else if (Array.isArray(deleteImages)) {
               imageIdsToDelete = deleteImages
            }

            if (Array.isArray(imageIdsToDelete) && imageIdsToDelete.length > 0) {
               const imagesToDelete = await RentalImg.findAll({
                  where: {
                     id: { [Op.in]: imageIdsToDelete },
                  },
               })

               // 파일 시스템에서 이미지 파일 삭제
               imagesToDelete.forEach((image) => {
                  const filePath = path.join(__dirname, '..', 'uploads', image.imgUrl.replace('/uploads/', ''))
                  try {
                     fs.unlinkSync(filePath)
                  } catch (err) {
                     console.error('파일 삭제 실패:', err.message)
                  }
               })

               // 데이터베이스에서 이미지 삭제
               await RentalImg.destroy({
                  where: {
                     id: { [Op.in]: imageIdsToDelete },
                  },
               })
            }
         } catch (imageDeleteError) {
            console.error('이미지 삭제 중 오류:', imageDeleteError)
         }
      }

      // 새로운 이미지 파일이 있으면 추가
      if (req.files && req.files.length > 0) {
         const imageData = req.files.map((file) => ({
            imgUrl: `/uploads/${file.filename}`,
            alt: rentalItemNm || rentalItem.rentalItemNm,
            originName: file.originalname,
            rentalItemId: rentalItem.id,
         }))

         await RentalImg.bulkCreate(imageData)
      }

      // 키워드 업데이트
      if (keywords !== undefined) {
         try {
            // 기존 키워드 연결 삭제
            await ItemKeyword.destroy({ where: { rentalItemId: id } })

            if (keywords && keywords.trim()) {
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
                     rentalItemId: id,
                     keywordId: keyword.id,
                  })
               }
            }
         } catch (keywordError) {
            console.error('키워드 업데이트 중 오류:', keywordError)
         }
      }

      // 수정된 렌탈상품 정보 조회
      const updatedRentalItem = await RentalItem.findByPk(id, {
         include: [
            {
               model: RentalImg,
               as: 'rentalImgs',
               attributes: ['id', 'imgUrl'],
            },
            {
               model: ItemKeyword,
               include: [
                  {
                     model: Keyword,
                     attributes: ['id', 'name'],
                  },
               ],
               attributes: [],
            },
         ],
      })

      res.status(200).json({
         success: true,
         message: '렌탈상품이 성공적으로 수정되었습니다.',
         data: updatedRentalItem,
      })
   } catch (error) {
      console.error('렌탈상품 수정 오류:', error)
      res.status(500).json({
         success: false,
         message: error.message || '렌탈상품 수정 중 오류가 발생했습니다.',
         error: {
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
         },
      })
   }
})
module.exports = router
