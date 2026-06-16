const mongoose = require("mongoose");

const platformSettingsSchema = new mongoose.Schema(
  {
    // ─── Identifier ───────────────────────────────────────
    // Sirf ek hi document hoga is collection mein
    // "singleton" pattern
    key: {
      type: String,
      default: "platform_settings",
      unique: true,
    },

    // ─── Store Info ───────────────────────────────────────
    store: {
      name: { type: String, default: "My eCommerce Store" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      address: { type: String, default: "" },
      logo: {
        url: { type: String, default: null },
        publicId: { type: String, default: null },
      },
      favicon: { type: String, default: null },
      currency: { type: String, default: "INR" },
      currencySymbol: { type: String, default: "₹" },
    },

    // ─── Vendor Settings ──────────────────────────────────
    vendor: {
      // Vendor registration on/off
      // OFF hone par frontend pe vendor option nahi dikhega
      isRegistrationEnabled: { type: Boolean, default: true },

      // Auto approve karna hai ya manually
      autoApprove: { type: Boolean, default: false },

      // Default commission rate
      defaultCommissionRate: { type: Number, default: 10 },

      // Minimum withdrawal amount
      minWithdrawalAmount: { type: Number, default: 500 },
    },

    // ─── Order Settings ───────────────────────────────────
    order: {
      // Free shipping threshold
      freeShippingAbove: { type: Number, default: 999 },

      // Default shipping charge
      defaultShippingCharge: { type: Number, default: 79 },

      // COD allowed hai ya nahi
      isCODEnabled: { type: Boolean, default: true },

      // COD extra charge
      codCharge: { type: Number, default: 0 },

      // Order cancel karne ka time limit (hours)
      cancellationWindowHours: { type: Number, default: 24 },

      // Return window (days)
      returnWindowDays: { type: Number, default: 7 },
    },

    // ─── Tax Settings ─────────────────────────────────────
    tax: {
      isGSTEnabled: { type: Boolean, default: true },
      defaultGSTRate: { type: Number, default: 18 },
      gstNumber: { type: String, default: "" },
    },

    // ─── Social Links ─────────────────────────────────────
    social: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
      whatsapp: { type: String, default: "" },
    },

    // ─── SEO ──────────────────────────────────────────────
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
      keywords: { type: [String], default: [] },
    },

    // ─── Maintenance ──────────────────────────────────────
    maintenance: {
      isEnabled: { type: Boolean, default: false },
      message: {
        type: String,
        default: "We are under maintenance. Back soon!",
      },
    },

    // ─── Email Settings ───────────────────────────────────
    email: {
      isEnabled: { type: Boolean, default: true },
      fromName: { type: String, default: "My Store" },
      fromEmail: { type: String, default: "" },
    },

    // ─── Last Updated By ──────────────────────────────────
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const PlatformSettings = mongoose.model(
  "PlatformSettings",
  platformSettingsSchema
);

module.exports = PlatformSettings;