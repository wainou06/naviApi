const Sequelize = require('sequelize')

module.exports = class RentalOrderItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            rentalOrderId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'RentalOrders',
                  key: 'id',
                  onUpdate: 'CASCADE',
                  onDelete: 'CASCADE',
               },
            },
            rentalItemId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'RentalItems',
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
            modelName: 'RentalOrderItem',
            tableName: 'RentalOrderItems',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      // RentalOrderItem -> RentalOrder (N:1)
      db.RentalOrderItem.belongsTo(db.RentalOrder, {
         foreignKey: 'rentalOrderId',
         targetKey: 'id',
         as: 'rentalOrder',
      })

      // RentalOrderItem -> RentalItem (N:1)
      db.RentalOrderItem.belongsTo(db.RentalItem, {
         foreignKey: 'rentalItemId',
         targetKey: 'id',
         as: 'rentalItem',
      })
   }
}
