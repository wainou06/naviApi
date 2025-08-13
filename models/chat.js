const Sequelize = require('sequelize')

module.exports = class Chat extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            itemId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Items',
                  key: 'id',
               },
            },
            buyerId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Users',
                  key: 'id',
               },
            },
            sellerId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Users',
                  key: 'id',
               },
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Chat',
            tableName: 'Chats',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      db.Chat.belongsTo(db.User, { foreignKey: 'buyerId', as: 'buyer' })
      db.Chat.belongsTo(db.User, { foreignKey: 'sellerId', as: 'seller' })
      db.Chat.belongsTo(db.Item, { foreignKey: 'itemId', as: 'item' })
      db.Chat.hasMany(db.Message, { foreignKey: 'chatId', sourceKey: 'id', as: 'messages' })
   }
}
