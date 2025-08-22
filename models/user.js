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

      db.User.hasMany(db.Item, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'items',
      })

      db.User.hasMany(db.RentalItem, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'rentalItems',
      })

      db.User.hasMany(db.Chat, {
         foreignKey: 'buyerId',
         sourceKey: 'id',
         as: 'buyChats',
      })

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
