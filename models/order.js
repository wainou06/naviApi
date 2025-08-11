const Sequelize = require('sequelize')

module.exports = class Order extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderStatus: {
               type: Sequelize.ENUM(
                  'PAYMENT_PENDING', // 결제 대기 중 (거래 제안 대기)
                  'PAID', // 결제 완료 (거래 진행 중)
                  'CANCELLED', // 거래 취소
                  'COMPLETED' // 거래 완료 (물건 인수인계 완료)
               ),
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
