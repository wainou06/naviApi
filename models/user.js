const Sequelize = require('sequelize')

module.exports = class User extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            email: {
               type: Sequelize.STRING(255),
               allowNull: false,
               unique: true,
            },
            name: {
               type: Sequelize.STRING(50),
               allowNull: false,
            },
            nick: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            password: {
               type: Sequelize.STRING(255),
               allowNull: true,
            },
            phone: {
               type: Sequelize.STRING(255),
               allowNull: true,
            },
            address: {
               type: Sequelize.STRING(255),
               allowNull: true,
            },
            access: {
               type: Sequelize.ENUM('MANAGER', 'USER'),
               allowNull: false,
               defaultValue: 'USER',
            },
            googleId: {
               type: Sequelize.STRING(255),
               allowNull: true,
               unique: true,
            },
            suspend: {
               type: Sequelize.DATE,
               allowNull: true,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'User',
            tableName: 'Users',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      // User -> Order (1:N)
      db.User.hasMany(db.Order, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'orders',
      })

      // User -> RentalOrder (1:N)
      db.User.hasMany(db.RentalOrder, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'rentalOrders',
      })

      db.User.hasMany(db.Rating, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'ratings',
      })

      // User -> Item (1:N)
      db.User.hasMany(db.Item, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'items',
      })

      // User -> RentalItem (1:N)
      db.User.hasMany(db.RentalItem, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'rentalItems',
      })

      // Buyer → Chat
      db.User.hasMany(db.Chat, {
         foreignKey: 'buyerId',
         sourceKey: 'id',
         as: 'buyChats',
      })

      // Seller → Chat
      db.User.hasMany(db.Chat, {
         foreignKey: 'sellerId',
         sourceKey: 'id',
         as: 'sellChats',
      })

      db.User.hasMany(db.Message, {
         foreignKey: 'senderId',
         sourceKey: 'id',
         as: 'sentMessages',
      })

      db.User.hasMany(db.PriceProposal, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'priceProposals',
      })
   }
}
