const Sequelize = require('sequelize')

module.exports = class Order extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderStatus: {
               type: Sequelize.STRING(255),
               allowNull: false,
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
      Order.hasOne(db.Item, {
         foreignKey: 'orderId',
         sourceKey: 'id',
      })
      Order.hasOne(db.Rating, {
         foreignKey: 'orderId',
         sourceKey: 'id',
      })
      Order.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
      })
   }
}
