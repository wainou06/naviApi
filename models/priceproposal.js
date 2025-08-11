const Sequelize = require('sequelize')

module.exports = class PriceProposal extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            proposedPrice: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            deliveryMethod: {
               type: Sequelize.ENUM('택배', '직거래', '기타'),
               allowNull: false,
               defaultValue: '택배',
            },
            itemId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Items',
                  key: 'id',
               },
            },
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Users',
                  key: 'id',
               },
            },
            status: {
               type: Sequelize.ENUM('pending', 'accepted', 'rejected'),
               allowNull: false,
               defaultValue: 'pending',
            },
         },
         {
            sequelize,
            timestamps: true,
            modelName: 'PriceProposal',
            tableName: 'PriceProposals',
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      this.belongsTo(db.Item, { foreignKey: 'itemId', targetKey: 'id', as: 'item' })
      this.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', as: 'user' })
   }
}
