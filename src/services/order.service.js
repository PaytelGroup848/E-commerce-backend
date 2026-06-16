const Order = require('../models/Order.model');
const Cart = require('../models/Cart.model');
const Product = require('../models/Products.model');
const ProductVariant = require('../models/productvarient.model');
const ApiError = require('../utils/ApiError');

class OrderService {
  // Generate unique order ID
  generateOrderId() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `ORD${year}${month}${day}${random}`;
  }

  // Create order from cart
  async createOrder(userId, orderData) {
    const {
      shippingAddress,
      billingAddress,
      paymentMethod,
      customerNote,
      couponCode,
      couponDiscount = 0,
      email
    } = orderData;

    // Get cart
    const cart = await Cart.findOne({ user: userId }).populate('items.product items.variant');
    if (!cart || cart.items.length === 0) {
      throw new ApiError(400, 'Cart is empty');
    }

    // Process each cart item
    const orderItems = [];
    let subtotal = 0;

    for (const item of cart.items) {
      const product = item.product;
      if (!product) {
        throw new ApiError(404, `Product not found`);
      }

      // Check stock
      if (item.variant) {
        const variant = await ProductVariant.findById(item.variant);
        if (variant && variant.stock < item.quantity) {
          throw new ApiError(400, `Only ${variant.stock} items available for ${product.name} - ${variant.name}`);
        }
        if (variant) {
          variant.stock -= item.quantity;
          await variant.save();
        }
      } else {
        if (product.stock < item.quantity) {
          throw new ApiError(400, `Only ${product.stock} items available for ${product.name}`);
        }
        product.stock -= item.quantity;
        await product.save();
      }

      const itemTotal = item.priceSnapshot.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        variant: item.variant?._id || null,
        name: product.name,
        sku: product.sku,
        quantity: item.quantity,
        price: item.priceSnapshot.price,
        originalPrice: item.priceSnapshot.originalPrice,
        total: itemTotal,
        image: product.images?.[0]?.url,
        variantName: item.priceSnapshot.variantName,
        vendor: product.vendor,
      });
    }

    // Calculate totals
    const shippingCharge = subtotal >= 999 ? 0 : 79;
    const taxRate = 18;
    const taxAmount = ((subtotal - couponDiscount) * taxRate) / 100;
    const total = subtotal - couponDiscount + shippingCharge + taxAmount;

    // Create order
    const order = await Order.create({
      orderId: this.generateOrderId(),
      user: userId,
      customerName: shippingAddress.fullName,
      customerEmail: email || shippingAddress.email,
      customerPhone: shippingAddress.phone,
      items: orderItems,
      subtotal,
      discountAmount: couponDiscount,
      couponCode: couponCode || null,
      couponDiscount,
      shippingCharge,
      taxAmount,
      taxRate,
      total,
      payment: {
        method: paymentMethod,
        status: paymentMethod === 'cod' ? 'pending' : 'pending',
      },
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      customerNote: customerNote || null,
      orderedAt: new Date(),
      orderStatusHistory: [{
        status: 'pending',
        message: 'Order placed successfully',
        createdAt: new Date()
      }]
    });

    // Clear cart after order
    cart.items = [];
    cart.appliedCoupon = null;
    await cart.save();

    return order;
  }

  // Get order by ID
  async getOrderById(orderId, userId, userRole) {
    const query = { _id: orderId };
    
    // If not admin, only get user's own orders
    if (userRole !== 'super_admin' && userRole !== 'sub_admin') {
      query.user = userId;
    }
    
    const order = await Order.findOne(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name slug images')
      .populate('items.variant', 'name attributes');
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    return order;
  }

  // Get order by order ID string
  async getOrderByOrderId(orderIdStr, userId, userRole) {
    const query = { orderId: orderIdStr };
    
    if (userRole !== 'super_admin' && userRole !== 'sub_admin') {
      query.user = userId;
    }
    
    const order = await Order.findOne(query)
      .populate('user', 'name email phone')
      .populate('items.product', 'name slug images');
    
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    return order;
  }

  // Get user orders
  async getUserOrders(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments({ user: userId })
    ]);
    
    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get all orders (Admin)
  async getAllOrders(page = 1, limit = 20, filters = {}) {
    const query = {};
    if (filters.status) query.status = filters.status;
    
    const skip = (page - 1) * limit;
    
    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email')
        .populate('items.product', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Order.countDocuments(query)
    ]);
    
    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Update order status
  async updateOrderStatus(orderId, status, userId, userRole, reason = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    // Check permission
    if (userRole !== 'super_admin' && userRole !== 'sub_admin') {
      throw new ApiError(403, 'Only admins can update order status');
    }
    
    const oldStatus = order.status;
    order.status = status;
    
    // Update timestamps based on status
    switch (status) {
      case 'confirmed':
        order.confirmedAt = new Date();
        break;
      case 'processing':
        order.processedAt = new Date();
        break;
      case 'shipped':
        order.shippedAt = new Date();
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        break;
      case 'cancelled':
        order.cancelledAt = new Date();
        order.cancellationReason = reason;
        break;
    }
    
    // Add to history
    order.orderStatusHistory.push({
      status,
      message: `Order status changed from ${oldStatus} to ${status}`,
      updatedBy: userId,
      createdAt: new Date()
    });
    
    await order.save();
    
    return order;
  }

  // Update payment status
  async updatePaymentStatus(orderId, paymentStatus, transactionId = null) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    order.payment.status = paymentStatus;
    if (transactionId) {
      order.payment.transactionId = transactionId;
    }
    
    if (paymentStatus === 'paid') {
      order.payment.paidAt = new Date();
    }
    
    await order.save();
    
    return order;
  }

  // Cancel order
  async cancelOrder(orderId, userId, userRole, reason) {
    const order = await Order.findById(orderId);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }
    
    // Check permission
    if (userRole !== 'super_admin' && userRole !== 'sub_admin' && order.user.toString() !== userId) {
      throw new ApiError(403, 'You can only cancel your own orders');
    }
    
    // Check if order can be cancelled
    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw new ApiError(400, 'Order cannot be cancelled at this stage');
    }
    
    // Restore stock
    for (const item of order.items) {
      if (item.variant) {
        await ProductVariant.findByIdAndUpdate(item.variant, {
          $inc: { stock: item.quantity }
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.quantity }
        });
      }
    }
    
    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancellationReason = reason;
    
    order.orderStatusHistory.push({
      status: 'cancelled',
      message: `Order cancelled. Reason: ${reason}`,
      updatedBy: userId,
      createdAt: new Date()
    });
    
    await order.save();
    
    return order;
  }

  // Get order statistics for dashboard
  async getOrderStats() {
    const now = new Date();
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const [totalOrders, todayOrders, weekOrders, monthOrders, pendingOrders] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      Order.countDocuments({ createdAt: { $gte: startOfWeek } }),
      Order.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Order.countDocuments({ status: 'pending' }),
    ]);
    
    const totalRevenue = await Order.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]);
    
    return {
      totalOrders,
      todayOrders,
      weekOrders,
      monthOrders,
      pendingOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
    };
  }
}

module.exports = new OrderService();