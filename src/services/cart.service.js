const Cart = require('../models/Cart.model');
const Product = require('../models/Products.model');
const ProductVariant = require('../models/productvarient.model');
const Coupon = require('../models/Coupon.model');
const ApiError = require('../utils/ApiError');

class CartService {
  async getCart(userId) {
    let cart = await Cart.findOne({ user: userId })
      .populate('items.product', 'name slug price originalPrice images stock status')
      .populate('items.variant', 'name price originalPrice stock attributes');
    
    if (!cart) {
      // Create empty cart if doesn't exist
      cart = await Cart.create({
        user: userId,
        items: [],
      });
    }
    
    // Calculate cart totals
    const totals = this.calculateTotals(cart);
    
    return {
      cart,
      ...totals,
    };
  }
  
  async addToCart(userId, productId, quantity, variantId = null) {
    // Get product details
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
    let variantStock = null;
    
    // If variant selected, get variant details
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
      variantStock = variant.stock;
      
      // Check stock for variant
      if (variantStock < quantity) {
        throw new ApiError(400, `Only ${variantStock} items available in stock`);
      }
    } else {
      // Check stock for simple product
      if (product.trackInventory && product.stock < quantity) {
        throw new ApiError(400, `Only ${product.stock} items available in stock`);
      }
    }
    
    // Get or create cart
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({
        user: userId,
        items: [],
      });
    }
    
    // Check if item already exists in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId && 
               (variantId ? item.variant?.toString() === variantId : !item.variant)
    );
    
    if (existingItemIndex > -1) {
      // Update quantity
      const newQuantity = cart.items[existingItemIndex].quantity + quantity;
      cart.items[existingItemIndex].quantity = newQuantity;
    } else {
      // Add new item
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
    
    // Update last activity
    cart.lastActivityAt = new Date();
    
    // Check for price changes
    for (const item of cart.items) {
      const currentProduct = await Product.findById(item.product);
      if (currentProduct) {
        let currentPrice = currentProduct.price;
        if (item.variant) {
          const variant = await ProductVariant.findById(item.variant);
          if (variant) {
            currentPrice = variant.price;
          }
        }
        
        if (currentPrice !== item.priceSnapshot.price) {
          item.isPriceChanged = true;
        }
      }
    }
    
    await cart.save();
    
    // Return updated cart
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
      // Remove item if quantity is 0 or negative
      item.remove();
    } else {
      item.quantity = quantity;
    }
    
    cart.lastActivityAt = new Date();
    await cart.save();
    
    return this.getCart(userId);
  }
  
  async removeItem(userId, itemId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
    }
    
    const item = cart.items.id(itemId);
    if (!item) {
      throw new ApiError(404, 'Item not found in cart');
    }
    
    item.remove();
    cart.lastActivityAt = new Date();
    await cart.save();
    
    return this.getCart(userId);
  }
  
  async clearCart(userId) {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      throw new ApiError(404, 'Cart not found');
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
    
    // Find coupon
    const coupon = await Coupon.findOne({
      code: couponCode.toUpperCase(),
      isActive: true,
      startDate: { $lte: new Date() },
      endDate: { $gte: new Date() },
    });
    
    if (!coupon) {
      throw new ApiError(404, 'Invalid or expired coupon');
    }
    
    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new ApiError(400, 'Coupon usage limit exceeded');
    }
    
    // Calculate cart subtotal
    const subtotal = this.calculateSubtotal(cart);
    
    // Check minimum order amount
    if (subtotal < coupon.minOrderAmount) {
      throw new ApiError(400, `Minimum order amount of ₹${coupon.minOrderAmount} required for this coupon`);
    }
    
    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (subtotal * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }
    
    // Apply coupon to cart
    cart.appliedCoupon = {
      couponId: coupon._id,
      code: coupon.code,
      discountAmount,
    };
    
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
    
    await cart.save();
    
    return this.getCart(userId);
  }
  
  calculateSubtotal(cart) {
    return cart.items.reduce((total, item) => {
      return total + (item.priceSnapshot.price * item.quantity);
    }, 0);
  }
  
  calculateTotals(cart) {
    const subtotal = this.calculateSubtotal(cart);
    const discount = cart.appliedCoupon?.discountAmount || 0;
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