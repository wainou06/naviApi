const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Op } = require('sequelize')
const { RentalItem, Img, Keyword, RentalItemKeyword, sequelize } = require('../models')
const router = express.Router()

// uploads 폴더가 없을 경우 새로 생성
try {
   fs.readdirSync('uploads') //해당 폴더가 있는지 확인
} catch (error) {
   console.log('uploads 폴더가 없어 uploads 폴더를 생성합니다.')
   fs.mkdirSync('uploads') //폴더 생성
}

// 이미지 업로드를 위한 multer 설정
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
})

// 렌탈상품 등록
router.post('/', upload.array('img'), async (req, res, next) => {
   const transaction = await sequelize.transaction()

   try {
      // 렌탈상품(rentalItem) insert
      const { name, price, stock, content, status = 'available', rentalPeriodMin = 1, rentalPeriodMax = 30, keywords } = req.body

      // 필수 필드 검증
      if (!name || !price || stock === undefined) {
         const error = new Error('상품명, 일일 렌탈가격, 재고는 필수 입력 항목입니다.')
         error.status = 400
         await transaction.rollback()
         return next(error)
      }

      const rentalItem = await RentalItem.create(
         {
            name,
            price,
            stock,
            content,
            status,
            rentalPeriodMin,
            rentalPeriodMax,
         },
         { transaction }
      )

      // 이미지(img) insert
      let images = []
      if (req.files && req.files.length > 0) {
         // imgs 테이블에 insert할 객체 생성
         const imageData = req.files.map((file) => ({
            url: `/${file.filename}`, //이미지 경로
            alt: name, // 상품명을 alt로 사용
            rentalItemId: rentalItem.id, // 생성된 렌탈상품 ID 연결
         }))

         // 이미지 여러개 insert
         images = await Img.bulkCreate(imageData, { transaction })
      }

      // 키워드 등록
      if (keywords) {
         const keywordArray = keywords
            .split(',')
            .map((k) => k.trim())
            .filter((k) => k)

         for (const keywordName of keywordArray) {
            // 키워드가 존재하지 않으면 생성
            const [keyword] = await Keyword.findOrCreate(
               {
                  where: { name: keywordName },
                  defaults: { name: keywordName },
               },
               { transaction }
            )

            // 렌탈상품-키워드 연결
            await RentalItemKeyword.create(
               {
                  rentalItemId: rentalItem.id,
                  keywordId: keyword.id,
               },
               { transaction }
            )
         }
      }

      // 트랜잭션 커밋
      await transaction.commit()

      res.status(201).json({
         success: true,
         message: '렌탈상품이 성공적으로 등록되었습니다.',
         rentalItem,
         images,
      })
   } catch (error) {
      // 트랜잭션 롤백
      await transaction.rollback()

      error.status = 500
      error.message = '렌탈상품 등록 중 오류가 발생했습니다.'
      next(error)
   }
})

// 전체 렌탈상품 불러오기(페이징, 검색 기능)
router.get('/', async (req, res, next) => {
   try {
      const page = parseInt(req.query.page, 10) || 1
      const limit = parseInt(req.query.limit, 10) || 5
      const offset = (page - 1) * limit

      // 상태, 상품명, 상품설명 값 가져오기
      const searchTerm = req.query.keyword || '' // 사용자가 입력한 검색어
      const searchCategory = req.query.searchCategory || 'name' // 상품명 or 상품설명으로 검색
      const sellCategory = req.query.status // 렌탈상품 상태

      /*
         스프레드 연산자(...)를 사용하는 이유는 조건적으로 객체를 추가하기 위해서
         스프레드 연산자는 "", false, 0, null, undefined 와 같은 falsy값들은 무시하고 
         값이 true 일때만 반환된 객체를 추가
      */
      // 조건부 where 절을 만드는 객체
      const whereClause = {
         // searchTerm이 존재하면 해당 검색어(searchTerm)가 포함된 검색 범주(searchCategory)를 조건으로 추가
         ...(searchTerm && {
            [Op.or]: [{ name: { [Op.like]: `%${searchTerm}%` } }, { content: { [Op.like]: `%${searchTerm}%` } }],
         }),
         //sellCategory가 존재하면 status가 해당 상태와 일치하는 항목을 조건으로 추가
         ...(sellCategory && {
            status: sellCategory,
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
               model: Img,
               as: 'images',
               attributes: ['id', 'url', 'alt'],
            },
            {
               model: Keyword,
               as: 'keywords',
               through: { attributes: [] },
               attributes: ['id', 'name'],
            },
         ],
      })

      res.json({
         success: true,
         message: '렌탈상품 목록 조회 성공',
         rentalItems,
         pagination: {
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
         },
      })
   } catch (error) {
      error.status = 500
      error.message = '전체 렌탈상품 리스트를 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

//렌탈상품 삭제 localhost:8000/rental-item/:id
router.delete('/:id', async (req, res, next) => {
   const transaction = await sequelize.transaction()

   try {
      const id = req.params.id //렌탈상품id

      //렌탈상품이 존재하는지 확인
      const rentalItem = await RentalItem.findByPk(id, { transaction })

      //렌탈상품이 존재하지 않으면
      if (!rentalItem) {
         const error = new Error('렌탈상품을 찾을 수 없습니다')
         error.status = 404
         await transaction.rollback()
         return next(error)
      }

      // 연관 데이터 삭제 (CASCADE로 설정되어 있다면 자동 삭제됨)
      await RentalItemKeyword.destroy({ where: { rentalItemId: id }, transaction })
      await Img.destroy({ where: { rentalItemId: id }, transaction })

      //렌탈상품 삭제
      await rentalItem.destroy({ transaction })

      // 트랜잭션 커밋
      await transaction.commit()

      res.json({
         success: true,
         message: '렌탈상품이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      // 트랜잭션 롤백
      await transaction.rollback()

      error.status = 500
      error.message = '렌탈상품 삭제 중 오류가 발생했습니다.'
      next(error)
   }
})

// 특정 렌탈상품 불러오기 localhost:8000/rental-item/:id
router.get('/:id', async (req, res, next) => {
   try {
      const id = req.params.id

      const rentalItem = await RentalItem.findOne({
         where: { id }, // 특정 렌탈상품 id로 조회
         include: [
            {
               model: Img,
               as: 'images',
               attributes: ['id', 'url', 'alt'],
            },
            {
               model: Keyword,
               as: 'keywords',
               through: { attributes: [] },
               attributes: ['id', 'name'],
            },
         ],
      })

      if (!rentalItem) {
         const error = new Error('해당 렌탈상품을 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      res.json({
         success: true,
         message: '렌탈상품 조회 성공',
         rentalItem,
      })
   } catch (error) {
      error.status = 500
      error.message = '렌탈상품을 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

// 렌탈상품 수정
router.put('/:id', upload.array('img'), async (req, res, next) => {
   const transaction = await sequelize.transaction()

   try {
      const id = req.params.id
      const { name, price, stock, content, status, rentalPeriodMin, rentalPeriodMax, keywords } = req.body

      // 렌탈상품이 존재하는지 확인
      const rentalItem = await RentalItem.findByPk(id, { transaction })

      if (!rentalItem) {
         const error = new Error('해당 렌탈상품을 찾을 수 없습니다.')
         error.status = 404
         await transaction.rollback()
         return next(error)
      }

      // 렌탈상품 정보 업데이트
      const updateData = {}
      if (name !== undefined) updateData.name = name
      if (price !== undefined) updateData.price = price
      if (stock !== undefined) updateData.stock = stock
      if (content !== undefined) updateData.content = content
      if (status !== undefined) updateData.status = status
      if (rentalPeriodMin !== undefined) updateData.rentalPeriodMin = rentalPeriodMin
      if (rentalPeriodMax !== undefined) updateData.rentalPeriodMax = rentalPeriodMax

      await rentalItem.update(updateData, { transaction })

      // 수정할 이미지가 존재하는 경우
      if (req.files && req.files.length > 0) {
         // 기존 이미지 삭제
         await Img.destroy({ where: { rentalItemId: id }, transaction })

         // 새 이미지 추가
         const imageData = req.files.map((file) => ({
            url: `/${file.filename}`, //이미지 경로
            alt: name || rentalItem.name, // 상품명을 alt로 사용
            rentalItemId: rentalItem.id, // 렌탈상품 ID 연결
         }))

         // 이미지 여러개 insert
         await Img.bulkCreate(imageData, { transaction })
      }

      // 키워드 업데이트
      if (keywords !== undefined) {
         // 기존 키워드 연결 삭제
         await RentalItemKeyword.destroy({ where: { rentalItemId: id }, transaction })

         if (keywords) {
            const keywordArray = keywords
               .split(',')
               .map((k) => k.trim())
               .filter((k) => k)

            for (const keywordName of keywordArray) {
               const [keyword] = await Keyword.findOrCreate(
                  {
                     where: { name: keywordName },
                     defaults: { name: keywordName },
                  },
                  { transaction }
               )

               await RentalItemKeyword.create(
                  {
                     rentalItemId: id,
                     keywordId: keyword.id,
                  },
                  { transaction }
               )
            }
         }
      }

      // 트랜잭션 커밋
      await transaction.commit()

      res.json({
         success: true,
         message: '렌탈상품과 이미지가 성공적으로 수정되었습니다.',
      })
   } catch (error) {
      // 트랜잭션 롤백
      await transaction.rollback()

      error.status = 500
      error.message = '렌탈상품 수정 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
