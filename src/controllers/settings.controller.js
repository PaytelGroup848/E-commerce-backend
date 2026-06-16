const settingsService = require('../services/settings.service');
const ApiResponse = require('../utils/ApiResponse');

class SettingsController {
  // Get all settings (Admin only)
  async getSettings(req, res, next) {
    try {
      const settings = await settingsService.getSettings();
      res.status(200).json(
        ApiResponse.success('Settings fetched successfully', { settings })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update settings (Admin only)
  async updateSettings(req, res, next) {
    try {
      const settings = await settingsService.updateSettings(req.body, req.user._id);
      res.status(200).json(
        ApiResponse.success('Settings updated successfully', { settings })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get vendor registration status (Public)
  async getVendorRegistrationStatus(req, res, next) {
    try {
      const status = await settingsService.getVendorRegistrationStatus();
      res.status(200).json(
        ApiResponse.success('Vendor registration status fetched', status)
      );
    } catch (error) {
      next(error);
    }
  }

  // Update vendor registration status (Admin only)
  async updateVendorRegistrationStatus(req, res, next) {
    try {
      const { isEnabled } = req.body;
      const settings = await settingsService.updateVendorRegistrationStatus(isEnabled, req.user._id);
      res.status(200).json(
        ApiResponse.success('Vendor registration status updated', { settings })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update vendor auto approve (Admin only)
  async updateVendorAutoApprove(req, res, next) {
    try {
      const { autoApprove } = req.body;
      const settings = await settingsService.updateVendorAutoApprove(autoApprove, req.user._id);
      res.status(200).json(
        ApiResponse.success('Vendor auto approve updated', { settings })
      );
    } catch (error) {
      next(error);
    }
  }

  // Update commission rate (Admin only)
  async updateCommissionRate(req, res, next) {
    try {
      const { rate } = req.body;
      const settings = await settingsService.updateCommissionRate(rate, req.user._id);
      res.status(200).json(
        ApiResponse.success('Commission rate updated', { settings })
      );
    } catch (error) {
      next(error);
    }
  }

  // Get store info (Public)
  async getStoreInfo(req, res, next) {
    try {
      const storeInfo = await settingsService.getStoreInfo();
      res.status(200).json(
        ApiResponse.success('Store info fetched successfully', { storeInfo })
      );
    } catch (error) {
      next(error);
    }
  }

  // Check maintenance mode (Public)
  async checkMaintenance(req, res, next) {
    try {
      const maintenance = await settingsService.isMaintenanceMode();
      res.status(200).json(
        ApiResponse.success('Maintenance status fetched', maintenance)
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SettingsController();