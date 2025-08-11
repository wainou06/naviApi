const Sequelize = require('sequelize')
const env = 'development'
const config = require('../config/config.json')[env]

const Img = require('./img')
const Item = require('./items')
const Keyword = require('./keyword')
const Order = require('./order')
const Rating = require('./rating')
const RentalImg = require('./rentalImg.js')
const RentalItem = require('./rentalItem')
const RentalOrder = require('./rentalOrder')
const User = require('./user.js')
const ItemKeyword = require('./itemKeyword.js')
const RentalOrderItem = require('./rentalOrderItem.js')
const Chat = require('./chat')
const Message = require('./message')
const PriceProposal = require('./priceproposal.js')

const db = {}
const sequelize = new Sequelize(config.database, config.username, config.password, config)

db.sequelize = sequelize
db.Sequelize = Sequelize
db.Img = Img
db.Item = Item
db.Keyword = Keyword
db.Order = Order
db.Rating = Rating
db.RentalImg = RentalImg
db.RentalItem = RentalItem
db.RentalOrder = RentalOrder
db.User = User
db.ItemKeyword = ItemKeyword
db.RentalOrderItem = RentalOrderItem
db.Chat = Chat
db.Message = Message
db.PriceProposal = PriceProposal

Img.init(sequelize)
Item.init(sequelize)
Keyword.init(sequelize)
Order.init(sequelize)
Rating.init(sequelize)
RentalImg.init(sequelize)
RentalItem.init(sequelize)
RentalOrder.init(sequelize)
User.init(sequelize)
ItemKeyword.init(sequelize)
RentalOrderItem.init(sequelize)
Chat.init(sequelize)
Message.init(sequelize)
PriceProposal.init(sequelize)

Img.associate(db)
Item.associate(db)
Keyword.associate(db)
Order.associate(db)
Rating.associate(db)
RentalImg.associate(db)
RentalItem.associate(db)
RentalOrder.associate(db)
User.associate(db)
ItemKeyword.associate(db)
RentalOrderItem.associate(db)
Chat.associate(db)
Message.associate(db)
PriceProposal.associate(db)

module.exports = db
