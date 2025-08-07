const Sequelize = require('sequelize')

module.exports = class Img extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            originName: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            imgUrl: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            field: {
               type: Sequelize.ENUM('Y', 'N'),
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Img',
            tableName: 'Imgs',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Img.belongsTo(db.Item, {
         foreignKey: 'itemId',
         targetKey: 'id',
      })
   }
}
