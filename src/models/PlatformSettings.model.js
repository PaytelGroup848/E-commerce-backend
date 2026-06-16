const mongoose = require('mongoose');

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'platform_settings',
      unique: true, // ✅ Already creates index
    },

    store: {
      name: { type: String, default: 'My eCommerce Store' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
      address: { type: String, default: '' },
      logo: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
      },
      favicon: { type: String, default: null },
      currency: { type: String, default: 'INR' },
      currencySymbol: { type: String, default: '₹' },
    },

    vendor: {
      isRegistrationEnabled: { type: Boolean, default: true },
      autoApprove: { type: Boolean, default: false },
      defaultCommissionRate: { type: Number, default: 10 },
      minWithdrawalAmount: { type: Number, default: 500 },
      vendorApprovalRequired: { type: Boolean, default: true },
    },

    order: {
      freeShippingAbove: { type: Number, default: 999 },
      defaultShippingCharge: { type: Number, default: 79 },
      isCODEnabled: { type: Boolean, default: true },
      codCharge: { type: Number, default: 0 },
      cancellationWindowHours: { type: Number, default: 24 },
      returnWindowDays: { type: Number, default: 7 },
    },

    tax: {
      isGSTEnabled: { type: Boolean, default: true },
      defaultGSTRate: { type: Number, default: 18 },
      gstNumber: { type: String, default: '' },
    },

    commission: {
      globalRate: { type: Number, default: 10 },
      minWithdrawalAmount: { type: Number, default: 500 },
    },

    social: {
      facebook: { type: String, default: '' },
      instagram: { type: String, default: '' },
      twitter: { type: String, default: '' },
      youtube: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
    },

    seo: {
      metaTitle: { type: String, default: '' },
      metaDescription: { type: String, default: '' },
      keywords: { type: [String], default: [] },
    },

    maintenance: {
      isEnabled: { type: Boolean, default: false },
      message: { type: String, default: 'We are under maintenance. Back soon!' },
    },

    email: {
      isEnabled: { type: Boolean, default: true },
      fromName: { type: String, default: 'My Store' },
      fromEmail: { type: String, default: '' },
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// ✅ REMOVED - Duplicate index (unique: true already creates it)
// platformSettingsSchema.index({ key: 1 });

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

module.exports = PlatformSettings;