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

// 렌탈상품 등록 /rental/create (미들웨어 추가)
router.post('/', isLoggedIn, upload.array('img'), async (req, res) => {
   try {
      // 모델 필드명에 맞게 수정
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
         userId: req.user.id, // 사용자 ID 추가
      })

      // 이미지(RentalImg) insert
      let images = []
      if (req.files && req.files.length > 0) {
         // RentalImg 테이블에 insert할 객체 생성
         const imageData = req.files.map((file) => ({
            url: `/${file.filename}`, //이미지 경로
            alt: rentalItemNm, // 상품명을 alt로 사용
            rentalItemId: rentalItem.id, // 생성된 렌탈상품 ID 연결
         }))

         // 이미지 여러개 insert
         images = await RentalImg.bulkCreate(imageData)
      }

      // 키워드 등록
      if (keywords) {
         const keywordArray = keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k)

         for (const keywordName of keywordArray) {
            // 키워드가 존재하지 않으면 생성
            const [keyword] = await Keyword.findOrCreate({
               where: { name: keywordName },
               defaults: { name: keywordName },
            })

            // 렌탈상품-키워드 연결 (ItemKeyword 테이블 사용)
            await ItemKeyword.create({
               rentalItemId: rentalItem.id,
               keywordId: keyword.id,
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
      res.status(500).json({
         success: false,
         message: '렌탈상품 등록에 실패했습니다.',
         error: error.message,
      })
   }
})

//GET /rental/list - 상품 목록 조회 (검색, 페이징 기능)
router.get('/list', async (req, res) => {
   try {
      const page = parseInt(req.query.page, 10) || 1
      const limit = parseInt(req.query.limit, 10) || 5
      const offset = (page - 1) * limit

      // 상태, 상품명, 상품설명 값 가져오기
      const searchTerm = req.query.keyword || '' // 사용자가 입력한 검색어
      const searchCategory = req.query.searchCategory || 'rentalItemNm' // 상품명 or 상품설명으로 검색
      const sellCategory = req.query.rentalStatus // 렌탈상품 상태

      // 조건부 where 절을 만드는 객체
      const whereClause = {
         // searchTerm이 존재하면 해당 검색어(searchTerm)가 포함된 검색 범주(searchCategory)를 조건으로 추가
         ...(searchTerm && {
            [Op.or]: [{ rentalItemNm: { [Op.like]: `%${searchTerm}%` } }, { rentalDetail: { [Op.like]: `%${searchTerm}%` } }],
         }),
         //sellCategory가 존재하면 rentalStatus가 해당 상태와 일치하는 항목을 조건으로 추가
         ...(sellCategory && {
            rentalStatus: sellCategory,
         }),
      }

      // 전체 렌탈상품 갯수
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
               attributes: ['id', 'url', 'alt'],
            },
            {
               model: ItemKeyword,
               include: [
                  {
                     model: Keyword,
                     attributes: ['id', 'name'],
                  },
               ],
               attributes: [], // ItemKeyword의 다른 필드는 제외
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
      res.status(500).json({
         success: false,
         message: '전체 렌탈상품 리스트를 불러오는데 실패했습니다.',
         error: error.message,
      })
   }
})

//DELETE 렌탈상품 삭제 /rental/:id
router.delete('/:id', async (req, res) => {
   try {
      const id = req.params.id //렌탈상품id

      //렌탈상품이 존재하는지 확인
      const rentalItem = await RentalItem.findByPk(id)

      //렌탈상품이 존재하지 않으면
      if (!rentalItem) {
         return res.status(404).json({
            success: false,
            message: '렌탈상품을 찾을 수 없습니다.',
         })
      }

      // 연관 데이터 삭제 (CASCADE로 설정되어 있다면 자동 삭제됨)
      await ItemKeyword.destroy({ where: { rentalItemId: id } })
      await RentalImg.destroy({ where: { rentalItemId: id } })

      //렌탈상품 삭제
      await rentalItem.destroy()

      res.status(200).json({
         success: true,
         message: '렌탈상품이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      console.error('렌탈상품 삭제 오류:', error)
      res.status(500).json({
         success: false,
         message: '렌탈상품 삭제에 실패했습니다.',
         error: error.message,
      })
   }
})

// 특정 렌탈상품 불러오기 /rental/detail/:id
router.get('/detail/:id', async (req, res) => {
   try {
      const id = req.params.id

      const rentalItem = await RentalItem.findOne({
         where: { id }, // 특정 렌탈상품 id로 조회
         include: [
            {
               model: RentalImg,
               as: 'rentalImgs',
               attributes: ['id', 'url', 'alt'],
            },
            {
               model: ItemKeyword,
               include: [
                  {
                     model: Keyword,
                     attributes: ['id', 'name'],
                  },
               ],
               attributes: [], // ItemKeyword의 다른 필드는 제외
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
      res.status(500).json({
         success: false,
         message: '렌탈상품을 불러오는데 실패했습니다.',
         error: error.message,
      })
   }
})

// 렌탈 상품 수정 /rental/edit/:id
router.put('/edit/:id', upload.array('img'), async (req, res) => {
   try {
      const id = req.params.id
      const { rentalItemNm, oneDayPrice, quantity, rentalDetail, rentalStatus, keywords, deleteImages } = req.body

      // 렌탈상품이 존재하는지 확인
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

      // 삭제할 이미지가 있을 경우 처리
      if (deleteImages && deleteImages.length > 0) {
         // 삭제할 이미지 ID들 처리
         const imageIdsToDelete = JSON.parse(deleteImages) // JSON으로 받은 삭제할 이미지 리스트

         // 해당 이미지들을 데이터베이스에서 삭제
         const imagesToDelete = await RentalImg.findAll({
            where: {
               id: { [Op.in]: imageIdsToDelete },
            },
         })

         // 파일 시스템에서 이미지 파일 삭제
         imagesToDelete.forEach((image) => {
            const filePath = path.join(__dirname, '..', 'uploads', image.url.replace('/uploads/', '').replace('/', ''))
            try {
               fs.unlinkSync(filePath) // 이미지 파일 삭제
            } catch (err) {
               console.log('파일 삭제 실패:', err.message)
            }
         })

         // 이미지 DB에서 삭제
         await RentalImg.destroy({
            where: {
               id: { [Op.in]: imageIdsToDelete },
            },
         })
      }

      // 수정할 이미지가 존재하는 경우
      if (req.files && req.files.length > 0) {
         // 새 이미지 추가
         const imageData = req.files.map((file) => ({
            url: `/${file.filename}`, //이미지 경로
            alt: rentalItemNm || rentalItem.rentalItemNm, // 상품명을 alt로 사용
            rentalItemId: rentalItem.id, // 렌탈상품 ID 연결
         }))

         // 이미지 여러개 insert
         await RentalImg.bulkCreate(imageData)
      }

      // 키워드 업데이트
      if (keywords !== undefined) {
         // 기존 키워드 연결 삭제
         await ItemKeyword.destroy({ where: { rentalItemId: id } })

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
                  rentalItemId: id,
                  keywordId: keyword.id,
               })
            }
         }
      }

      // 수정된 렌탈상품 정보 조회
      const updatedRentalItem = await RentalItem.findByPk(id, {
         include: [
            {
               model: RentalImg,
               as: 'rentalImgs',
               attributes: ['id', 'url', 'alt'],
            },
            {
               model: ItemKeyword,
               include: [
                  {
                     model: Keyword,
                     attributes: ['id', 'name'],
                  },
               ],
               attributes: [], // ItemKeyword의 다른 필드는 제외
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
         message: '렌탈상품 수정에 실패했습니다.',
         error: error.message,
      })
   }
})

module.exports = router
