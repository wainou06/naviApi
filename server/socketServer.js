// server/socketServer.js
const { Server } = require('socket.io')

function setupSocket(server) {
   const io = new Server(server, {
      cors: {
         origin: process.env.FRONTEND_APP_URL || '*',
         methods: ['GET', 'POST'],
      },
   })

   io.on('connection', (socket) => {
      console.log('A user connected:', socket.id)

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
