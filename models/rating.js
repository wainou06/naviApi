const Sequelize = require('sequelize')

module.exports = class Rating extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            rating: {
               type: Sequelize.INTEGER,
               allowNull: false,
               validate: {
                  min: 1,
                  max: 5,
               },
            },
            comment: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
            priceproposalId: {
               type: Sequelize.INTEGER,
               allowNull: true,
            },
            rentalOrderId: {
               type: Sequelize.INTEGER,
               allowNull: true,
               references: {
                  model: 'RentalOrders',
                  key: 'id',
               },
               onUpdate: 'CASCADE',
               onDelete: 'CASCADE',
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
      db.Rating.belongsTo(db.RentalOrder, {
         foreignKey: 'rentalOrderId',
         targetKey: 'id',
         as: 'rentalOrder',
      })
   }
}
