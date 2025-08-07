const Sequelize = require('sequelize')

module.exports = class RentalOrder extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            quantity: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
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
      RentalOrder.hasMany(db.RentalOrderItem, {
         foreignKey: 'rentalOrderId',
         sourceKey: 'id',
      })
      RentalOrder.hasOne(db.Rating, {
         foreignKey: 'rentalOrderId',
         sourceKey: 'id',
      })
      RentalOrder.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
      })
   }
}
