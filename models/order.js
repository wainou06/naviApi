const Sequelize = require('sequelize')

module.exports = class Order extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderStatus: {
               type: Sequelize.STRING(255),
               allowNull: false,
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
      // Order -> User (N:1)
      db.Order.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
         as: 'user',
      })

      // Order -> Item (1:N)
      db.Order.hasOne(db.Item, {
         foreignKey: 'orderId',
         sourceKey: 'id',
         as: 'items',
      })
      db.Order.hasOne(db.Rating, {
         foreignKey: 'orderId',
         sourceKey: 'id',
      })
   }
}
