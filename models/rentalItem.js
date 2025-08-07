const Sequelize = require('sequelize')

module.exports = class RentalItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            rentalItemNm: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            quantity: {
               type: Sequelize.INTEGER,
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
      RentalItem.hasMany(db.RentalImg, {
         foreignKey: 'rentalItemId',
         sourceKey: 'id',
      })
      RentalItem.hasMany(db.ItemKeyword, {
         foreignKey: 'rentalItemId',
         sourceKey: 'id',
      })
      RentalItem.hasMany(db.RentalOrderItem, {
         foreignKey: 'rentalItemId',
         sourceKey: 'id',
      })
   }
}
