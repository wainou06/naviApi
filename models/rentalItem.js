const Sequelize = require('sequelize')

module.exports = class RentalItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            rentalItemNm: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
            oneDayPrice: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            rentalStatus: {
               type: Sequelize.ENUM('Y', 'N'),
               allowNull: false,
            },
            rentalDetail: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
            quantity: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'RentalItem',
            tableName: 'RentalItems',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      // RentalItem <-> RentalOrder
      db.RentalItem.belongsToMany(db.RentalOrder, {
         through: db.RentalOrderItem,
         foreignKey: 'rentalItemId',
         otherKey: 'rentalOrderId',
         as: 'rentalOrders',
      })

      // RentalItem -> RentalImg (1:N)
      db.RentalItem.hasMany(db.RentalImg, {
         foreignKey: 'rentalItemId',
         sourceKey: 'id',
         as: 'rentalImgs',
      })

      db.RentalItem.hasMany(db.ItemKeyword, {
         foreignKey: 'rentalItemId',
         sourceKey: 'id',
      })
   }
}
