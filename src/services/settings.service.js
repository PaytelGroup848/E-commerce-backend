const PlatformSettings = require('../models/PlatformSettings.model');
const ApiError = require('../utils/ApiError');

class SettingsService {
  // Get settings (creates default if not exists)
  async getSettings() {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({ key: 'platform_settings' });
    }
    return settings;
  }

  // Update settings
  async updateSettings(updateData, userId) {
    const settings = await this.getSettings();
    
    // Update each section if provided
    if (updateData.store) {
      settings.store = { ...settings.store, ...updateData.store };
    }
    
    if (updateData.vendor) {
      settings.vendor = { ...settings.vendor, ...updateData.vendor };
    }
    
    if (updateData.order) {
      settings.order = { ...settings.order, ...updateData.order };
    }
    
    if (updateData.tax) {
      settings.tax = { ...settings.tax, ...updateData.tax };
    }
    
    if (updateData.social) {
      settings.social = { ...settings.social, ...updateData.social };
    }
    
    if (updateData.seo) {
      settings.seo = { ...settings.seo, ...updateData.seo };
    }
    
    if (updateData.maintenance) {
      settings.maintenance = { ...settings.maintenance, ...updateData.maintenance };
    }
    
    if (updateData.email) {
      settings.email = { ...settings.email, ...updateData.email };
    }
    
    settings.updatedBy = userId;
    await settings.save();
    
    return settings;
  }

  // Get vendor registration status (public)
  async getVendorRegistrationStatus() {
    const settings = await this.getSettings();
    return {
      isEnabled: settings.vendor.isRegistrationEnabled,
      autoApprove: settings.vendor.autoApprove,
      defaultCommissionRate: settings.vendor.defaultCommissionRate,
      minWithdrawalAmount: settings.vendor.minWithdrawalAmount
    };
  }

  // Update vendor registration status (admin only)
  async updateVendorRegistrationStatus(isEnabled, userId) {
    const settings = await this.getSettings();
    settings.vendor.isRegistrationEnabled = isEnabled;
    settings.updatedBy = userId;
    await settings.save();
    return settings;
  }

  // Update vendor auto approve setting
  async updateVendorAutoApprove(autoApprove, userId) {
    const settings = await this.getSettings();
    settings.vendor.autoApprove = autoApprove;
    settings.updatedBy = userId;
    await settings.save();
    return settings;
  }

  // Update commission rate
  async updateCommissionRate(rate, userId) {
    const settings = await this.getSettings();
    settings.vendor.defaultCommissionRate = rate;
    settings.updatedBy = userId;
    await settings.save();
    return settings;
  }

  // Get store info (public)
  async getStoreInfo() {
    const settings = await this.getSettings();
    return settings.store;
  }

  // Get order settings
  async getOrderSettings() {
    const settings = await this.getSettings();
    return settings.order;
  }

  // Get tax settings
  async getTaxSettings() {
    const settings = await this.getSettings();
    return settings.tax;
  }

  // Check if maintenance mode is enabled
  async isMaintenanceMode() {
    const settings = await this.getSettings();
    return {
      isEnabled: settings.maintenance.isEnabled,
      message: settings.maintenance.message
    };
  }
}

module.exports = new SettingsService();