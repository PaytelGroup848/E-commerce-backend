const Cart = require('../models/Cart.model');
const Product = require('../models/Products.model');
const ProductVariant = require('../models/productvarient.model');
const Coupon = require('../models/Coupon.model');
const ApiError = require('../utils/ApiError');

class CartService {
  async getCart(userId) {
    let cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'name slug price originalPrice images stock status trackInventory')
      .populate('items.variant', 'name price originalPrice stock attributes');

    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
      });
    }

    const totals = this.calculateTotals(cart);

    return {
      cart,
      ...totals,
    };
  }

  async addToCart(userId, productId, quantity, variantId = null) {
    const product = await Product.findOne({
      _id: productId,
      status: 'active',
    });

    if (!product) {
      throw new ApiError(404, 'Product not found or inactive');
    }

    let price = product.price;
    let originalPrice = product.originalPrice;
    let variantName = null;
    let availableStock = product.stock;

    if (variantId) {
      const variant = await ProductVariant.findOne({
        _id: variantId,
        product: productId,
        isActive: true,
      });

      if (!variant) {
        throw new ApiError(404, 'Variant not found');
      }

      price = variant.price;
      originalPrice = variant.originalPrice;
      variantName = variant.name;
      availableStock = variant.stock;
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
      });
    }

    const existingItemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === productId &&
        (variantId ? item.variant?.toString() === variantId : !item.variant)
    );

    const currentQuantity =
      existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0;
    const finalQuantity = currentQuantity + quantity;

    if (variantId) {
      if (availableStock < finalQuantity) {
        throw new ApiError(400, `Only ${availableStock} items available in stock`);
      }
    } else if (product.trackInventory && availableStock < finalQuantity) {
      throw new ApiError(400, `Only ${availableStock} items available in stock`);
    }

    if (existingItemIndex > -1) {
      cart.items[existingItemIndex].quantity = finalQuantity;
      cart.items[existingItemIndex].priceSnapshot = {
        price,
        originalPrice,
        variantName,
      };
      cart.items[existingItemIndex].isPriceChanged = false;
    } else {
      cart.items.push({
        product: productId,
        variant: variantId,
        quantity,
        priceSnapshot: {
          price,
          originalPrice,
          variantName,
        },
      });
    }

    cart.lastActivityAt = new Date();

    for (const item of cart.items) {
      const currentProduct = await Product.findById(item.product);
      if (!currentProduct) continue;

      let currentPrice = currentProduct.price;
      if (item.variant) {
        const variant = await ProductVariant.findById(item.variant);
        if (variant) currentPrice = variant.price;
      }

      item.isPriceChanged = currentPrice !== item.priceSnapshot.price;
    }

    await cart.save();

    return this.getCart(userId);
  }

  async updateQuantity(userId, itemId, quantity) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    const item = cart.items.id(itemId);
    if (!item) {
      throw new ApiError(404, 'Item not found in cart');
    }

    if (quantity <= 0) {
  cart.items.pull({ _id: itemId });
  cart.lastActivityAt = new Date();
  await cart.save();
  return this.getCart(userId);
}

    const product = await Product.findOne({
      _id: item.product,
      status: 'active',
    });

    if (!product) {
      throw new ApiError(404, 'Product not found or inactive');
    }

    if (item.variant) {
      const variant = await ProductVariant.findOne({
        _id: item.variant,
        product: product._id,
        isActive: true,
      });

      if (!variant) {
        throw new ApiError(404, 'Variant not found');
      }

      if (variant.stock < quantity) {
        throw new ApiError(400, `Only ${variant.stock} items available in stock`);
      }

      item.priceSnapshot = {
        price: variant.price,
        originalPrice: variant.originalPrice,
        variantName: variant.name,
      };
    } else {
      if (product.trackInventory && product.stock < quantity) {
        throw new ApiError(400, `Only ${product.stock} items available in stock`);
      }

      item.priceSnapshot = {
        price: product.price,
        originalPrice: product.originalPrice,
        variantName: null,
      };
    }

    item.quantity = quantity;
    item.isPriceChanged = false;
    cart.lastActivityAt = new Date();
    await cart.save();

    return this.getCart(userId);
  }

 async removeItem(userId, itemId) {
  const cart = await Cart.findOne({ user: userId });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const itemExists = cart.items.some((item) => item._id.toString() === itemId);
  if (!itemExists) {
    throw new ApiError(404, 'Item not found in cart');
  }

  cart.items.pull({ _id: itemId });
  cart.lastActivityAt = new Date();

  await cart.save();

  return this.getCart(userId);
}

  async clearCart(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return this.getCart(userId);
    }

    cart.items = [];
    cart.appliedCoupon = {
      couponId: null,
      code: null,
      discountAmount: 0,
    };
    cart.lastActivityAt = new Date();
    await cart.save();

    return this.getCart(userId);
  }

  async applyCoupon(userId, couponCode) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });

    if (!coupon) {
      throw new ApiError(404, 'Invalid or expired coupon');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, 'Coupon usage limit exceeded');
    }

    const subtotal = this.calculateSubtotal(cart);

    if (subtotal < coupon.minOrderAmount) {
      throw new ApiError(
        400,
        `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`
      );
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }

    discountAmount = Math.min(discountAmount, subtotal);

    cart.appliedCoupon = {
      couponId: coupon._id,
      code: coupon.code,
      discountAmount,
    };
    cart.lastActivityAt = new Date();

    await cart.save();

    return this.getCart(userId);
  }

  async removeCoupon(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }

    cart.appliedCoupon = {
      couponId: null,
      code: null,
      discountAmount: 0,
    };
    cart.lastActivityAt = new Date();

    await cart.save();

    return this.getCart(userId);
  }

  calculateSubtotal(cart) {
    return cart.items.reduce((total, item) => {
      return total + item.priceSnapshot.price * item.quantity;
    }, 0);
  }

  calculateTotals(cart) {
    const subtotal = this.calculateSubtotal(cart);
    const discount = Math.min(cart.appliedCoupon?.discountAmount || 0, subtotal);
    const total = subtotal - discount;

    return {
      subtotal,
      discount,
      total,
      itemCount: cart.items.length,
      totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }
}

module.exports = new CartService();
