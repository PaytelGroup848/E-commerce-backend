const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    // ─── Basic Info ───────────────────────────────────────
    code: {
      type: String,
      required: [true, "Coupon code is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },

    description: {
      type: String,
      default: null,
    },

    // ─── Discount Type ────────────────────────────────────
    discountType: {
      type: String,
      enum: ["percentage", "flat"],
      required: true,
    },

    // Percentage: 10 matlab 10% off
    // Flat: 100 matlab ₹100 off
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },

    // Percentage discount mein max kitna milega
    // e.g. 20% off but max ₹200
    maxDiscountAmount: {
      type: Number,
      default: null,
    },

    // ─── Conditions ───────────────────────────────────────
    // Minimum order amount
    minOrderAmount: {
      type: Number,
      default: 0,
    },

    // ─── Validity ─────────────────────────────────────────
    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    // ─── Usage Limits ─────────────────────────────────────
    // Total kitni baar use ho sakta hai
    usageLimit: {
      type: Number,
      default: null, // null = unlimited
    },

    // Ek user kitni baar use kar sakta hai
    usageLimitPerUser: {
      type: Number,
      default: 1,
    },

    // Total kitni baar use hua
    usedCount: {
      type: Number,
      default: 0,
    },

    // ─── Scope ────────────────────────────────────────────
    // Sirf specific users ke liye
    applicableUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Sirf specific products pe
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
      },
    ],

    // Sirf specific categories pe
    applicableCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
    ],

    // ─── Created By ───────────────────────────────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
couponSchema.index({ code: 1 });
couponSchema.index({ isActive: 1, startDate: 1, endDate: 1 });
couponSchema.index({ createdBy: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);

module.exports = Coupon;