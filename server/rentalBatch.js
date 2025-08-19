const { RentalOrder, RentalOrderItem, RentalItem } = require('../models')
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
            for (const orderItem of order.rentalOrderItems) {
               await RentalItem.increment('quantity', {
                  by: orderItem.quantity,
                  where: { id: orderItem.rentalItemId },
               })
            }
            await order.update({ orderStatus: 'completed' })
         }
      } catch (error) {
         console.error('렌탈 재고 복원 오류:', error)
      }
   }

   runBatch()

   setInterval(runBatch, 30 * 1000)
}

module.exports = { startRentalBatchJob }
