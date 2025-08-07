const Sequelize = require('sequelize')

module.exports = class Item extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            itemNm: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            price: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            itemSellStatus: {
               type: Sequelize.ENUM('SELL', 'SOLD_OUT', 'ON_SALE'),
               allowNull: false,
            },
            itemDetail: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Item',
            tableName: 'Items',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Item.hasMany(db.Img, {
         foreignKey: 'itemId',
         sourceKey: 'id',
      })
      Item.hasMany(db.ItemKeyword, {
         foreignKey: 'itemId',
         sourceKey: 'id',
      })
      Item.belongsTo(db.Order, {
         foreignKey: 'orderId',
         targetKey: 'id',
      })
   }
}
