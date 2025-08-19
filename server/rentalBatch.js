const { RentalOrder, RentalOrderItem, RentalItem, sequelize } = require('../models')
const { Op } = require('sequelize')

function startRentalBatchJob() {
   const runBatch = async () => {
      try {
         const today = new Date()
         today.setHours(0, 0, 0, 0)

         const expiredOrders = await RentalOrder.findAll({
            where: {
               useEnd: { [Op.lt]: today },
               orderStatus: { [Op.ne]: 'completed' },
            },
            include: [
               {
                  model: RentalOrderItem,
                  as: 'rentalOrderItems',
               },
            ],
         })

         for (const order of expiredOrders) {
            const t = await sequelize.transaction()
            try {
               for (const orderItem of order.rentalOrderItems) {
                  await RentalItem.increment(
                     'quantity',
                     {
                        by: orderItem.quantity,
                        where: { id: orderItem.rentalItemId },
                     },
                     { transaction: t }
                  )
               }
               await order.update({ orderStatus: 'completed' }, { transaction: t })
               await t.commit()
            } catch (error) {
               await t.rollback()
               throw error
            }
         }
      } catch (error) {
         console.error('렌탈 재고 복원 오류:', error)
      }
   }

   runBatch()
   setInterval(runBatch, 60 * 1000)
}

module.exports = { startRentalBatchJob }
