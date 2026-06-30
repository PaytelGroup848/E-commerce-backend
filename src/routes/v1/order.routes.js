const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

// All order routes require authentication
router.use(protect);

// ==================== ADMIN ROUTES ====================
// Keep admin routes before "/:id", otherwise Express treats "admin" as an id.
router.get(
  '/admin/all',
  restrictTo('super_admin', 'sub_admin'),
  orderController.getAllOrders
);

router.put(
  '/admin/:id/status',
  restrictTo('super_admin', 'sub_admin'),
  orderController.updateOrderStatus
);

// order done route 
router.post(
  '/:id/payment-done-test',
  orderController.markPaymentDoneTest
);

// ==================== USER ROUTES ====================
router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getUserOrders);
router.get('/order-id/:orderId', orderController.getOrderByOrderId);
router.get('/:id', orderController.getOrderById);
router.post('/:id/cancel', orderController.cancelOrder);

module.exports = router;
