const Sequelize = require('sequelize')

module.exports = class ItemKeyword extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {},
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'ItemKeyword',
            tableName: 'ItemKeywords',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      ItemKeyword.belongsTo(db.Item, {
         foreignKey: 'itemId',
         targetKey: 'id',
      })
      ItemKeyword.belongsTo(db.RentalItem, {
         foreignKey: 'rentalItemId',
         targetKey: 'id',
      })
      ItemKeyword.belongsTo(db.Keyword, {
         foreignKey: 'keywordId',
         targetKey: 'id',
      })
   }
}
