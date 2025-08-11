const Sequelize = require('sequelize')

module.exports = class Message extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            chatId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Chats',
                  key: 'id',
               },
            },
            senderId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Users',
                  key: 'id',
               },
            },
            content: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Message',
            tableName: 'Messages',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      // Message → Chat
      db.Message.belongsTo(db.Chat, {
         foreignKey: 'chatId',
         as: 'chat',
      })

      // Message → User (Sender)
      db.Message.belongsTo(db.User, {
         foreignKey: 'senderId',
         as: 'sender',
      })
   }
}
