const Sequelize = require('sequelize')

module.exports = class Rating extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            rating: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            comment: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Rating',
            tableName: 'Ratings',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Rating.belongsTo(db.User, {
         foreignKey: 'fromUserId',
         targetKey: 'id',
      })
      Rating.belongsTo(db.User, {
         foreignKey: 'toUserId',
         targetKey: 'id',
      })
      Rating.belongsTo(db.Order, {
         foreignKey: 'orderId',
         targetKey: 'id',
      })
      Rating.belongsTo(db.RentalOrder, {
         foreignKey: 'rentalOrderId',
         targetKey: 'id',
      })
   }
}
