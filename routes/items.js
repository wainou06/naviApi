const express = require('express')
const multer = require('multer')
const path = require('path')
const { Item, Img, ItemKeyword, Keyword, Order, User } = require('../models')
const { Op } = require('sequelize')
const { isLoggedIn } = require('./middlewares')
const fs = require('fs')
const router = express.Router()

// multer 설정 (이미지 업로드)
const storage = multer.diskStorage({
   destination: (req, file, cb) => {
      cb(null, 'uploads/') // uploads 폴더에 저장
   },
   filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
   },
})

const upload = multer({
   storage: storage,
   limits: {
      fileSize: 5 * 1024 * 1024, // 5MB 제한
   },
   fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
         cb(null, true)
      } else {
         cb(new Error('이미지 파일만 업로드 가능합니다.'), false)
      }
   },
})

// GET /items/list - 상품 목록 조회 (검색, 페이징 기능)
router.get('/list', async (req, res) => {
   try {
      const { page = 1, limit = 12, searchTerm = '', searchCategory = '', sellCategory = '' } = req.query

      const offset = (page - 1) * limit

      // 검색 조건 설정
      let whereClause = {}

      if (searchTerm) {
         whereClause.itemNm = {
            [Op.like]: `%${searchTerm}%`,
         }
      }

      if (sellCategory && sellCategory !== '') {
         whereClause.itemSellStatus = sellCategory
      }

      // 상품 목록 조회
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
         order: [['createdAt', 'DESC']],
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
      res.status(500).json({
         success: false,
         message: '상품 목록을 불러오는데 실패했습니다.',
         error: error.message,
      })
   }
})

// GET /items/detail/:id - 상품 상세 조회
router.get('/detail/:id', async (req, res) => {
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
            {
               model: Order,
               as: 'order',
               required: false,
               include: [
                  {
                     model: User,
                     as: 'user',
                     required: false,
                     attributes: ['id', 'name', 'email'], // 민감한 정보 제외
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
      res.status(500).json({
         success: false,
         message: '상품을 불러오는데 실패했습니다.',
         error: error.message,
      })
   }
})

// POST /items - 상품 등록
router.post('/', isLoggedIn, upload.array('img', 5), async (req, res) => {
   try {
      const { name, price, stock, content, status, keywords } = req.body

      // 필수 필드 검증
      if (!name || !price || !content) {
         return res.status(400).json({
            success: false,
            message: '상품명, 가격, 상품내용은 필수 항목입니다.',
         })
      }

      // 상태값 매핑 (프론트엔드 값을 DB ENUM 값으로 변환)
      const statusMapping = {
         sell: 'SELL',
         sold_out: 'SOLD_OUT',
         reservation: 'RESERVATION',
      }

      const mappedStatus = statusMapping[status] || status || 'SELL'

      // 상품 생성
      const newItem = await Item.create({
         itemNm: name,
         price: parseInt(price),
         itemSellStatus: mappedStatus,
         itemDetail: content,
         userId: req.user.id,
      })

      // 이미지 저장
      if (req.files && req.files.length > 0) {
         const imagePromises = req.files.map((file, index) => {
            return Img.create({
               originName: file.originalname,
               imgUrl: `/uploads/${file.filename}`,
               field: index === 0 ? 'Y' : 'N', // 첫 번째 이미지를 대표 이미지로 설정
               itemId: newItem.id,
            })
         })
         await Promise.all(imagePromises)
      }

      // 키워드 저장 (키워드가 있는 경우)
      if (keywords) {
         const keywordArray = keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k)

         for (const keywordName of keywordArray) {
            // 키워드가 이미 존재하는지 확인, 없으면 생성
            const [keyword] = await Keyword.findOrCreate({
               where: { name: keywordName },
               defaults: { name: keywordName },
            })

            // ItemKeyword 관계 생성
            await ItemKeyword.create({
               itemId: newItem.id,
               keywordId: keyword.id,
               startAt: new Date(),
               endAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1년 후
            })
         }
      }

      // 생성된 상품 정보를 다시 조회 (관련 데이터 포함)
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
      // 로그인 상태가 아닐 때
      if (error.message && error.message.includes('로그인 후 상품을 등록할 수 있습니다.')) {
         return res.status(403).json({
            success: false,
            message: '로그인 후 상품을 등록할 수 있습니다.',
         })
      }

      // 그 외 다른 오류 처리
      res.status(500).json({
         success: false,
         message: '상품 등록에 실패했습니다.',
         error: error.message || error,
      })
   }
})

// PUT /items/edit/:id - 상품 수정
router.put('/edit/:id', upload.array('img', 5), async (req, res) => {
   try {
      const { id } = req.params
      const { name, price, stock, content, status, keywords, deleteImages } = req.body

      // 상품 존재 확인
      const item = await Item.findByPk(id)
      if (!item) {
         return res.status(404).json({
            success: false,
            message: '상품을 찾을 수 없습니다.',
         })
      }

      // 상품 정보 업데이트
      const updateData = {}
      if (name !== undefined) updateData.itemNm = name
      if (price !== undefined) updateData.price = parseInt(price)
      if (status !== undefined) {
         // 상태값 매핑
         const statusMapping = {
            sell: 'SELL',
            sold_out: 'SOLD_OUT',
            reservation: 'RESERVATION',
         }
         updateData.itemSellStatus = statusMapping[status] || status
      }
      if (content !== undefined) updateData.itemDetail = content

      await item.update(updateData)

      // 삭제할 이미지가 있을 경우 처리
      if (deleteImages && deleteImages.length > 0) {
         // 삭제할 이미지 ID들 처리
         const imageIdsToDelete = JSON.parse(deleteImages) // JSON으로 받은 삭제할 이미지 리스트

         // 해당 이미지들을 데이터베이스에서 삭제
         const imagesToDelete = await Img.findAll({
            where: {
               id: { [Op.in]: imageIdsToDelete },
            },
         })

         // 파일 시스템에서 이미지 파일 삭제
         imagesToDelete.forEach((image) => {
            const filePath = path.join(__dirname, '..', 'uploads', image.imgUrl.replace('/uploads/', ''))
            fs.unlinkSync(filePath) // 이미지 파일 삭제
         })

         // 이미지 DB에서 삭제
         await Img.destroy({
            where: {
               id: { [Op.in]: imageIdsToDelete },
            },
         })
      }

      // 새로운 이미지가 있는 경우 추가
      if (req.files && req.files.length > 0) {
         const imagePromises = req.files.map((file, index) => {
            return Img.create({
               originName: file.originalname,
               imgUrl: `/uploads/${file.filename}`,
               field: 'N', // 새로 추가된 이미지는 대표이미지가 아님
               itemId: item.id,
            })
         })
         await Promise.all(imagePromises)
      }

      // 키워드 업데이트
      if (keywords !== undefined) {
         // 기존 키워드 관계 삭제
         await ItemKeyword.destroy({
            where: { itemId: item.id },
         })

         // 새로운 키워드 추가
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

      // 수정된 상품 정보 조회
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
      res.status(500).json({
         success: false,
         message: '상품 수정에 실패했습니다.',
         error: error.message,
      })
   }
})

// DELETE /items/:id - 상품 삭제
router.delete('/:id', async (req, res) => {
   try {
      const { id } = req.params

      // 상품 존재 확인
      const item = await Item.findByPk(id)
      if (!item) {
         return res.status(404).json({
            success: false,
            message: '상품을 찾을 수 없습니다.',
         })
      }

      // 관련 데이터들도 함께 삭제 (Cascade 설정으로 자동 삭제됨)
      // 하지만 명시적으로 삭제할 수도 있습니다.
      await ItemKeyword.destroy({
         where: { itemId: id },
      })

      await Img.destroy({
         where: { itemId: id },
      })

      // 상품 삭제 (paranoid: true로 설정되어 있어 soft delete)
      await item.destroy()

      res.status(200).json({
         success: true,
         message: '상품이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      console.error('상품 삭제 오류:', error)
      res.status(500).json({
         success: false,
         message: '상품 삭제에 실패했습니다.',
         error: error.message,
      })
   }
})

module.exports = router
