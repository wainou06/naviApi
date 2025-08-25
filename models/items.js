const Sequelize = require('sequelize')

module.exports = class Item extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            itemNm: {
               type: Sequelize.STRING(100),
               allowNull: false,
            },
            price: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            itemSellStatus: {
               type: Sequelize.ENUM('SELL', 'SOLD_OUT', 'RESERVATION'),
               allowNull: false,
            },
            itemDetail: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Users',
                  key: 'id',
               },
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
      db.Item.hasMany(db.Img, {
         foreignKey: 'itemId',
         sourceKey: 'id',
         as: 'imgs',
      })
      db.Item.hasMany(db.ItemKeyword, {
         foreignKey: 'itemId',
         otherKey: 'keywordId',
      })
      db.Item.belongsTo(db.User, {
         foreignKey: 'userId',
         targetKey: 'id',
         as: 'user',
      })
      db.Item.hasOne(db.Chat, {
         foreignKey: 'itemId',
         sourceKey: 'id',
         as: 'chat',
      })
      db.Item.hasMany(db.PriceProposal, {
         foreignKey: 'itemId',
         sourceKey: 'id',
         as: 'priceProposals',
      })
   }
}
