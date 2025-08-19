const Sequelize = require('sequelize')

module.exports = class Order extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderStatus: {
               type: Sequelize.ENUM('PAYMENT_PENDING', 'PAID', 'CANCELLED', 'COMPLETED'),
               allowNull: false,
               defaultValue: 'PAYMENT_PENDING',
            },
            purchaseMethod: {
               type: Sequelize.ENUM('shipping', 'meetup', 'other'),
               allowNull: false,
               defaultValue: 'meetup',
            },
            userId: {
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
            modelName: 'Order',
            tableName: 'Orders',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      db.Order.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
         as: 'user',
      })

      db.Order.hasOne(db.Item, {
         foreignKey: 'orderId',
         sourceKey: 'id',
         as: 'item',
      })

      db.Order.hasOne(db.Rating, {
         foreignKey: 'orderId',
         sourceKey: 'id',
         as: 'rating',
      })
   }
}
