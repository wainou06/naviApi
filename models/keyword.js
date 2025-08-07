const Sequelize = require('sequelize')

module.exports = class Keyword extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            name: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Keyword',
            tableName: 'Keywords',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Keyword.hasMany(db.ItemKeyword, {
         foreignKey: 'keywordId',
         sourceKey: 'id',
      })
   }
}
