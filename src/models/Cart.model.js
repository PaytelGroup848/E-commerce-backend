const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    // Variant select kiya hai to
    variant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      default: null,
    },

    // Snapshot — cart mein add karte waqt price save karo
    // Price baad mein change ho to user ko pata chale
    priceSnapshot: {
      price: { type: Number, required: true },
      originalPrice: { type: Number, default: null },
      variantName: { type: String, default: null },
    },

    quantity: {
      type: Number,
      required: true,
      min: [1, "Quantity must be at least 1"],
      default: 1,
    },

    // Price change hua hai cart mein add karne ke baad
    isPriceChanged: {
      type: Boolean,
      default: false,
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const cartSchema = new mongoose.Schema(
  {
    // ─── User ─────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, 
    },

    // ─── Items ────────────────────────────────────────────
    items: {
      type: [cartItemSchema],
      default: [],
    },

    // ─── Coupon ───────────────────────────────────────────
    appliedCoupon: {
      couponId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Coupon",
        default: null,
      },
      code: { type: String, default: null },
      discountAmount: { type: Number, default: 0 },
    },

    // ─── Last Activity ────────────────────────────────────
    // Abandoned cart emails ke liye
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────
cartSchema.index({ user: 1 });
cartSchema.index({ lastActivityAt: 1 });

const Cart = mongoose.model("Cart", cartSchema);

module.exports = Cart;