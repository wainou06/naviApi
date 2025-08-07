const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
   definition: {
      openapi: '3.0.0',
      info: {
         title: 'navi API',
         version: '1.0.0',
         description: 'navi API 문서입니다.',
      },
      servers: [
         {
            url: process.env.APP_API_URL, // 실제 서버 주소로 바꾸세요
         },
      ],
   },
   apis: ['./routes/*.js'], // Swagger 주석이 달린 파일 경로
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = {
   swaggerUi,
   swaggerSpec,
}
