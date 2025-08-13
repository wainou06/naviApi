// server/index.js
const http = require('http')
const app = require('../app')
const setupSocket = require('./socketServer')

const server = http.createServer(app)
const io = setupSocket(server)

const PORT = process.env.PORT || 8000
server.listen(PORT, () => {
   console.log(`Server running on http://localhost:${PORT}`)
})
