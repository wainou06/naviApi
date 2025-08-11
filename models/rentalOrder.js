const Sequelize = require('sequelize')

module.exports = class RentalOrder extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderStatus: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            useStart: {
               type: Sequelize.DATE,
               allowNull: false,
            },
            useEnd: {
               type: Sequelize.DATE,
               allowNull: false,
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Users',
                  key: 'id',
                  onUpdate: 'CASCADE',
                  onDelete: 'CASCADE',
               },
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'RentalOrder',
            tableName: 'RentalOrders',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      // RentalOrder -> User (N:1)
      db.RentalOrder.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
         as: 'user',
      })

      // RentalOrder <-> RentalItem (다대다)
      db.RentalOrder.belongsToMany(db.RentalItem, {
         through: db.RentalOrderItem,
         foreignKey: 'rentalOrderId',
         otherKey: 'rentalItemId',
         as: 'rentalItems',
      })

      // RentalOrder -> RentalOrderItem (1:N) : CASCADE 설정 추가
      db.RentalOrder.hasMany(db.RentalOrderItem, {
         foreignKey: 'rentalOrderId',
         sourceKey: 'id',
         onDelete: 'CASCADE',
         hooks: true,
         as: 'rentalOrderItems',
      })

      // 대여 주문에 대한 평점(옵션)
      db.RentalOrder.hasOne(db.Rating, {
         foreignKey: 'rentalOrderId',
         sourceKey: 'id',
         as: 'rating',
      })
   }
}
