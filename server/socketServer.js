// socketServer.js
const { Server } = require('socket.io')

function setupSocket(server, sessionMiddleware) {
   const io = new Server(server, {
      cors: {
         origin: process.env.FRONTEND_APP_URL || '*',
         methods: ['GET', 'POST'],
         credentials: true,
      },
   })

   // Socket.io에서 세션 사용
   io.use((socket, next) => {
      sessionMiddleware(socket.request, {}, next)
   })

   io.on('connection', (socket) => {
      console.log('A user connected:', socket.id)

      // 채팅방 입장
      socket.on('joinChat', (chatId) => {
         socket.join(chatId)
         console.log(`Socket ${socket.id} joined chat ${chatId}`)
      })

      // 메시지 전송
      socket.on('sendMessage', (message) => {
         io.to(message.chatId).emit('receiveMessage', message)
      })

      // 제안 수락 이벤트
      socket.on('sendProposalAccepted', (data) => {
         io.to(data.receiverSocketId).emit('receiveProposalAccepted', data)
      })

      socket.on('disconnect', () => {
         console.log('User disconnected:', socket.id)
      })
   })

   return io
}

module.exports = setupSocket
