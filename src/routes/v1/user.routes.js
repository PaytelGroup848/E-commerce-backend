const express = require('express');
const router = express.Router();
const userController = require('../../controllers/user.controller');
const { protect } = require('../../middlewares/auth.middleware');

// All user routes require authentication
router.use(protect);

// ── Profile ──────────────────────────────────────────────
router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/change-password', userController.changePassword);

// ── Email change (OTP flow) ───────────────────────────────
router.post('/request-email-change', userController.requestEmailChange);
router.post('/verify-email-change', userController.verifyEmailChange);

// ── Address ──────────────────────────────────────────────
router.get('/addresses', userController.getAddresses);
router.post('/addresses', userController.addAddress);
router.put('/addresses/:addressId', userController.updateAddress);
router.delete('/addresses/:addressId', userController.deleteAddress);

// ── Orders ───────────────────────────────────────────────
router.get('/orders', userController.getUserOrders);

// ── Stats ────────────────────────────────────────────────
router.get('/stats', userController.getUserStats);

// ── Delete Account ───────────────────────────────────────
router.delete('/delete-account', userController.deleteAccount);

module.exports = router;