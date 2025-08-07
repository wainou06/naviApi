const Sequelize = require('sequelize')

module.exports = class User extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            email: {
               type: Sequelize.STRING(255),
               allowNull: false,
               unique: true,
            },
            name: {
               type: Sequelize.STRING(50),
               allowNull: false,
            },
            nick: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            password: {
               type: Sequelize.STRING(255),
               allowNull: true,
            },
            phone: {
               type: Sequelize.STRING(255),
               allowNull: true,
            },
            address: {
               type: Sequelize.STRING(255),
               allowNull: true,
            },
            access: {
               type: Sequelize.ENUM('MANAGER', 'USER'),
               allowNull: false,
               defaultValue: 'USER',
            },
            googleId: {
               type: Sequelize.STRING(255),
               allowNull: true,
               unique: true,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'User',
            tableName: 'Users',
            paranoid: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      // User -> Order (1:N)
      db.User.hasMany(db.Order, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'orders',
      })

      // User -> RentalOrder (1:N)
      db.User.hasMany(db.RentalOrder, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'rentalOrders',
      })

      db.User.hasMany(db.Rating, {
         foreignKey: 'userId',
         sourceKey: 'id',
         as: 'ratings',
      })

      // User -> Item (1:N) (유저와 아이템 관계 추가)
      db.User.hasMany(db.Item, {
         foreignKey: 'userId', // 아이템에 userId 외래 키 추가
         sourceKey: 'id',
         as: 'items',
      })
   }
}
