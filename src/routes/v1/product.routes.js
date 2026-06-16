const express = require('express');
const router = express.Router();
const productController = require('../../controllers/product.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

// Public routes
router.get('/', productController.getAllProducts);
router.get('/slug/:slug', productController.getProductBySlug);

// Vendor routes (require authentication)
router.use(protect);

// Vendor product management
router.get('/vendor/products', productController.getVendorProducts);
router.post('/', productController.createProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.patch('/:id/status', productController.updateProductStatus);

// Variant routes
router.post('/:productId/variants', productController.createVariant);
router.put('/variants/:variantId', productController.updateVariant);
router.delete('/variants/:variantId', productController.deleteVariant);

// Admin only routes
router.put('/:id/approve', restrictTo('super_admin', 'sub_admin'), productController.updateProductStatus);

module.exports = router;