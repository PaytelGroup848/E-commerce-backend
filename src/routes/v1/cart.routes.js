const express = require('express');
const router = express.Router();
const cartController = require('../../controllers/cart.controller');
const { protect } = require('../../middlewares/auth.middleware');
const validate = require('../../middlewares/validation.middleware');
const {
  addToCartSchema,
  updateQuantitySchema,
  applyCouponSchema,
} = require('../../validation/cart.validation');

// All cart routes require authentication
router.use(protect);

router.get('/', cartController.getCart);
router.post('/add', validate(addToCartSchema), cartController.addToCart);
router.put('/items/:itemId', validate(updateQuantitySchema), cartController.updateQuantity);
router.delete('/items/:itemId', cartController.removeItem);
router.delete('/clear', cartController.clearCart);
router.post('/apply-coupon', validate(applyCouponSchema), cartController.applyCoupon);
router.delete('/remove-coupon', cartController.removeCoupon);

module.exports = router;