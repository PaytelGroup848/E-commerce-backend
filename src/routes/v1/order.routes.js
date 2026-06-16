const express = require('express');
const router = express.Router();
const orderController = require('../../controllers/order.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

// All order routes require authentication
router.use(protect);

// ==================== USER ROUTES ====================
router.post('/', orderController.createOrder);
router.get('/my-orders', orderController.getUserOrders);
router.get('/:id', orderController.getOrderById);
router.get('/order-id/:orderId', orderController.getOrderByOrderId);
router.post('/:id/cancel', orderController.cancelOrder);

// ==================== ADMIN ROUTES ====================
router.get('/admin/all', restrictTo('super_admin', 'sub_admin'), orderController.getAllOrders);
router.put('/admin/:id/status', restrictTo('super_admin', 'sub_admin'), orderController.updateOrderStatus);

module.exports = router;