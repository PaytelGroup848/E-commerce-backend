const express = require('express');
const router = express.Router();
const settingsController = require('../../controllers/settings.controller');
const { protect, restrictTo } = require('../../middlewares/auth.middleware');

// ========== PUBLIC ROUTES (No Auth Required) ==========
router.get('/vendor-registration', settingsController.getVendorRegistrationStatus);
router.get('/store-info', settingsController.getStoreInfo);
router.get('/maintenance', settingsController.checkMaintenance);

// ========== ADMIN ONLY ROUTES ==========
router.use(protect);
router.use(restrictTo('super_admin', 'sub_admin'));

// General settings
router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);

// Vendor settings
router.put('/vendor-registration', settingsController.updateVendorRegistrationStatus);
router.put('/vendor-auto-approve', settingsController.updateVendorAutoApprove);
router.put('/commission-rate', settingsController.updateCommissionRate);

module.exports = router;