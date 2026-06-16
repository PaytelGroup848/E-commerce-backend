const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

// All admin routes require authentication and admin role
router.use(protect);
router.use(restrictTo('super_admin', 'sub_admin'));

// ==================== DASHBOARD ====================
router.get('/dashboard', adminController.getDashboardStats);

// ==================== VENDOR MANAGEMENT ====================
router.get('/vendors', adminController.getAllVendors);
router.get('/vendors/:id', adminController.getVendorById);
router.post('/vendors', adminController.createVendor);
router.put('/vendors/:id/approve', adminController.approveVendor);
router.put('/vendors/:id/reject', adminController.rejectVendor);
router.put('/vendors/:id/suspend', adminController.suspendVendor);
router.put('/vendors/:id/activate', adminController.activateVendor);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users', adminController.createUser);  // ✅ FIXED - This route was missing
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

// ==================== ORDER MANAGEMENT ====================
router.get('/orders', adminController.getAllOrders);
router.get('/orders/:id', adminController.getOrderById);
router.put('/orders/:id/status', adminController.updateOrderStatus);

// ==================== PRODUCT MANAGEMENT (Admin) ====================
router.get('/products', adminController.getAllProducts);
router.put('/products/:id/status', adminController.updateProductStatus);

module.exports = router;