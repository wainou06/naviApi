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
               allowNull: false,
            },
            phone: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            address: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            access: {
               type: Sequelize.ENUM('MANAGER', 'USER'),
               allowNull: false,
               defaultValue: 'USER',
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
      User.hasMany(db.Order, {
         foreignKey: 'userId',
         sourceKey: 'id',
      })
      User.hasMany(db.RentalOrder, {
         foreignKey: 'userId',
         sourceKey: 'id',
      })
      User.hasMany(db.Rating, {
         foreignKey: 'fromUserId',
         sourceKey: 'id',
      })
      User.hasMany(db.Rating, {
         foreignKey: 'toUserId',
         sourceKey: 'id',
      })
   }
}
