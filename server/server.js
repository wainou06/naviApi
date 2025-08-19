// server.js
const http = require('http')
const app = require('../app')
const setupSocket = require('./socketServer')
const { startRentalBatchJob } = require('./rentalBatch')

const server = http.createServer(app)

// sessionMiddleware 전달
const io = setupSocket(server, app.get('sessionMiddleware'))

startRentalBatchJob()

const PORT = process.env.PORT || 8002
server.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`)
})
