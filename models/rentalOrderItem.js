const Sequelize = require('sequelize')

module.exports = class RentalOrderItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            startAt: {
               type: Sequelize.DATE,
               allowNull: false,
            },
            endAt: {
               type: Sequelize.DATE,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'RentalOrderItem',
            tableName: 'RentalOrderItems',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      RentalOrderItem.belongsTo(db.RentalOrder, {
         foreignKey: 'rentalOrderId',
         targetKey: 'id',
      })
      RentalOrderItem.belongsTo(db.RentalItem, {
         foreignKey: 'rentalItemId',
         targetKey: 'id',
      })
   }
}
