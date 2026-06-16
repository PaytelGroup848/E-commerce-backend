const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // ─── Basic Info ───────────────────────────────────────
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [300, "Name cannot exceed 300 characters"],
    },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      required: [true, "Description is required"],
    },

    shortDescription: {
      type: String,
      maxlength: [500, "Short description cannot exceed 500 characters"],
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ─── Ownership ────────────────────────────────────────
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Admin ka product — vendor null hoga
    isAdminProduct: {
      type: Boolean,
      default: false,
    },

    // ─── Category ─────────────────────────────────────────
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    brand: {
      type: String,
      default: null,
    },

    // ─── Pricing ──────────────────────────────────────────
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },

    originalPrice: {
      type: Number,
      default: null,
    },

    // Discount % — originalPrice se calculate hoga
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ─── Tax ──────────────────────────────────────────────
    taxClass: {
      type: String,
      enum: ["none", "gst_5", "gst_12", "gst_18", "gst_28"],
      default: "gst_18",
    },

    // ─── Inventory ────────────────────────────────────────
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
    },

    // Stock track karna hai ya nahi
    // False ho to "unlimited stock" maana jayega
    trackInventory: {
      type: Boolean,
      default: true,
    },

    // ─── Images ───────────────────────────────────────────
    images: [
      {
        url: { type: String, required: true },
        publicId: String,
        isMain: { type: Boolean, default: false },
        displayOrder: { type: Number, default: 0 },
      },
    ],

    // ─── Variants ─────────────────────────────────────────
    // Variants hain ya nahi (Size/Color etc)
    hasVariants: {
      type: Boolean,
      default: false,
    },

    // ─── Specifications ───────────────────────────────────
    specifications: [
      {
        label: String, // e.g. "Material"
        value: String, // e.g. "Cotton"
      },
    ],

    // ─── Highlights ───────────────────────────────────────
    highlights: {
      type: [String],
      default: [],
    },

  

    // ─── Status ───────────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "active", "inactive", "rejected"],
      default: "draft",
    },

    rejectionReason: {
      type: String,
      default: null,
    },

    // ─── SEO ──────────────────────────────────────────────
    seo: {
      metaTitle: String,
      metaDescription: String,
      keywords: [String],
    },

    // ─── Stats ────────────────────────────────────────────
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    totalRatings: {
      type: Number,
      default: 0,
    },

    totalSold: {
      type: Number,
      default: 0,
    },

    viewCount: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
productSchema.index({ slug: 1 });
productSchema.index({ vendor: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ status: 1, isFeatured: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ totalSold: -1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ tags: 1 });

// Text search index — name aur description mein search
productSchema.index(
  { name: "text", description: "text", tags: "text" },
  { weights: { name: 10, tags: 5, description: 1 } }
);

const Product = mongoose.model("Product", productSchema);

module.exports = Product;