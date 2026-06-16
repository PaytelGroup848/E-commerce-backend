const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
  {
    // ─── Product Reference ────────────────────────────────
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // ─── Variant Identity ─────────────────────────────────
    // e.g. "Red / XL" ya "Blue / M"
    name: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      unique: true,
      sparse: true,
    },

    // ─── Attributes ───────────────────────────────────────
    // Variant ke attributes — Size, Color, etc
    // e.g. [ { name: "Color", value: "Red" }, { name: "Size", value: "XL" } ]
    attributes: [
      {
        name: { type: String, required: true },   // e.g. "Color"
        value: { type: String, required: true },  // e.g. "Red"
      },
    ],

    // ─── Pricing ──────────────────────────────────────────
    // Agar variant ka price alag ho to
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    originalPrice: {
      type: Number,
      default: null,
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

    // ─── Images ───────────────────────────────────────────
    // Variant ki alag image ho sakti hai
    // e.g. Red color ki alag image
    image: {
      url: { type: String, default: null },
      publicId: { type: String, default: null },
    },

    // ─── Status ───────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    // Display order
    displayOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
productVariantSchema.index({ product: 1 });
productVariantSchema.index({ product: 1, isActive: 1 });
productVariantSchema.index({ sku: 1 });

const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

module.exports = ProductVariant;