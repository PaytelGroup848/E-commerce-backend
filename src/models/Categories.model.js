const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    // URL mein use hoga → /category/mobile-phones
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null }, // Cloudinary ke liye
    },

    // ─── Tree Structure ka Magic ──────────────────────────
    // Agar null hai → ye top-level category hai (Electronics, Fashion)
    // Agar koi _id hai → ye us category ka child hai
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },

    // Kitne level neeche hai ye category
    // Electronics = 1, Mobile Phones = 2, Smartphones = 3
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 4, // Maximum 4 levels allowed
    },

    // Is category ke saare ancestors ki list
    // Smartphones ke ancestors = [Electronics_id, MobilePhones_id]
    // Fast querying ke liye — ek hi query mein pura path milta hai
    ancestors: [
      {
        _id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
        },
        name: String,
        slug: String,
      },
    ],

    // ─── Display ──────────────────────────────────────────
    // Sidebar mein kaun pehle aayega
    displayOrder: {
      type: Number,
      default: 0,
    },

    // Featured categories homepage pe dikhti hain
    isFeatured: {
      type: Boolean,
      default: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    // ─── SEO ──────────────────────────────────────────────
    seo: {
      metaTitle: { type: String, maxlength: 60 },
      metaDescription: { type: String, maxlength: 160 },
      keywords: [String],
    },

    // Kitne products hain is category mein
    // Order place hone par update hoga — real time count
    productCount: {
      type: Number,
      default: 0,
    },

    // ─── NEW: Track who created this category ─────────────
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    createdByRole: {
      type: String,
      enum: ["super_admin", "sub_admin", "vendor", "customer"],
      default: "super_admin",
    },
  },
  {
    timestamps: true, // createdAt, updatedAt automatic
  }
);

// ─── Indexes ──────────────────────────────────────────────────
// Ye queries fast karti hain

// Slug se dhundhna (har category page pe use hoga)
categorySchema.index({ slug: 1 });

// Parent se children dhundhna
categorySchema.index({ parent: 1 });

// Active + featured categories nikalna
categorySchema.index({ isActive: 1, isFeatured: 1 });

// Level wise categories
categorySchema.index({ level: 1, isActive: 1 });

// Display order ke hisaab se sort
categorySchema.index({ displayOrder: 1 });

// Index for createdBy (vendor specific queries)
categorySchema.index({ createdBy: 1, createdByRole: 1 });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;