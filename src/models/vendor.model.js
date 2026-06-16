const mongoose = require("mongoose");

const bankDetailsSchema = new mongoose.Schema(
  {
    accountHolderName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    branchName: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const vendorSchema = new mongoose.Schema(
  {
    // ─── User Reference ───────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,  // ✅ Creates index automatically
    },

    // ─── Business Info ────────────────────────────────────
    businessName: {
      type: String,
      required: [true, "Business name is required"],
      trim: true,
    },

    businessEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    businessPhone: {
      type: String,
    },

    businessDescription: {
      type: String,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },

    // ─── Business Address ─────────────────────────────────
    businessAddress: {
      addressLine1: String,
      addressLine2: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "India" },
    },

    // ─── Legal Documents ──────────────────────────────────
    gstin: {
      type: String,
      default: null,
    },

    panNumber: {
      type: String,
      default: null,
    },

    documents: [
      {
        type: {
          type: String,
          enum: ["pan_card", "gst_certificate", "aadhar", "other"],
        },
        url: String,
        publicId: String,
        isVerified: { type: Boolean, default: false },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ─── Vendor Status ────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },

    approvalInfo: {
      actionBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      actionAt: Date,
      rejectionReason: String,
      suspensionReason: String,
    },

    // ─── Bank Details ─────────────────────────────────────
    bankDetails: {
      type: bankDetailsSchema,
      default: {},
    },

    // ─── Store Info ───────────────────────────────────────
    storeName: {
      type: String,
      trim: true,
    },

    storeSlug: {
      type: String,
      unique: true,     // ✅ Creates index automatically
      sparse: true,
      lowercase: true,
    },

    storeRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },

    // ─── Earnings ─────────────────────────────────────────
    totalEarnings: {
      type: Number,
      default: 0,
    },

    pendingEarnings: {
      type: Number,
      default: 0,
    },

    withdrawnAmount: {
      type: Number,
      default: 0,
    },

    // ─── Commission ───────────────────────────────────────
    commissionRate: {
      type: Number,
      default: 10,
      min: 0,
      max: 100,
    },

    // ─── Stats ────────────────────────────────────────────
    totalProducts: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    totalRevenue: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
// ✅ user & storeSlug already indexed via unique:true
// ✅ Only add indexes for fields WITHOUT unique:true
vendorSchema.index({ status: 1 });
vendorSchema.index({ createdAt: -1 });

const Vendor = mongoose.model("Vendor", vendorSchema);

module.exports = Vendor;