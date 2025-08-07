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
            userId: {
               type: Sequelize.INTEGER,
               allowNull: false,
               references: {
                  model: 'Users',
                  key: 'id',
               },
               onUpdate: 'CASCADE',
               onDelete: 'CASCADE',
            },
            orderId: {
               type: Sequelize.INTEGER,
               allowNull: true, // null 허용 (렌탈주문일 수도 있으니)
               references: {
                  model: 'Orders',
                  key: 'id',
               },
               onUpdate: 'CASCADE',
               onDelete: 'CASCADE',
            },
            rentalOrderId: {
               type: Sequelize.INTEGER,
               allowNull: true, // null 허용 (일반주문일 수도 있으니)
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
      // Rating -> User (N:1)
      Rating.belongsTo(db.User, {
         foreignKey: 'fromUserId',
         targetKey: 'id',
      })
      Rating.belongsTo(db.User, {
         foreignKey: 'toUserId',
         targetKey: 'id',
      })
      // Rating -> Order (N:1)
      db.Rating.belongsTo(db.Order, {
         foreignKey: 'orderId',
         targetKey: 'id',
         as: 'order',
      })

      // Rating -> RentalOrder (N:1)
      db.Rating.belongsTo(db.RentalOrder, {
         foreignKey: 'rentalOrderId',
         targetKey: 'id',
         as: 'rentalOrder',
      })
   }
}
