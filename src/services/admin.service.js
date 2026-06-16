const User = require('../models/User.model');
const Vendor = require('../models/vendor.model');
const Order = require('../models/Order.model');
const Product = require('../models/Products.model');
const ApiError = require('../utils/ApiError');

class AdminService {
  // Dashboard Stats
  async getDashboardStats() {
    const [totalUsers, totalVendors, totalOrders, totalProducts, recentOrders] = await Promise.all([
      User.countDocuments(),
      Vendor.countDocuments(),
      Order.countDocuments(),
      Product.countDocuments(),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name email')
    ]);

    return {
      stats: {
        totalUsers,
        totalVendors,
        totalOrders,
        totalProducts,
      },
      recentOrders,
    };
  }

  // Vendor Management
  async getAllVendors(page, limit, filters) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { businessName: { $regex: filters.search, $options: 'i' } },
        { businessEmail: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [vendors, total] = await Promise.all([
      Vendor.find(query).populate('user', 'name email').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Vendor.countDocuments(query)
    ]);

    return { vendors, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getVendorById(id) {
    const vendor = await Vendor.findById(id).populate('user', 'name email phone');
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    return vendor;
  }

  async approveVendor(id, adminId) {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    vendor.status = 'approved';
    vendor.approvalInfo = { actionBy: adminId, actionAt: new Date() };
    await vendor.save();
    await User.findByIdAndUpdate(vendor.user, { role: 'vendor', status: 'active' });
    return vendor;
  }

  async rejectVendor(id, adminId, reason) {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    vendor.status = 'rejected';
    vendor.approvalInfo = { actionBy: adminId, actionAt: new Date(), rejectionReason: reason };
    await vendor.save();
    return vendor;
  }

  async suspendVendor(id, adminId, reason) {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    vendor.status = 'suspended';
    vendor.approvalInfo = { ...vendor.approvalInfo, suspensionReason: reason };
    await vendor.save();
    await User.findByIdAndUpdate(vendor.user, { status: 'suspended' });
    return vendor;
  }

  async activateVendor(id, adminId) {
    const vendor = await Vendor.findById(id);
    if (!vendor) throw new ApiError(404, 'Vendor not found');
    vendor.status = 'approved';
    await vendor.save();
    await User.findByIdAndUpdate(vendor.user, { status: 'active' });
    return vendor;
  }

  // User Management
  async getAllUsers(page, limit, filters) {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).select('-password').skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query)
    ]);

    return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getUserById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  async updateUserRole(id, role, adminId) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'super_admin') throw new ApiError(403, 'Cannot change super admin role');
    user.role = role;
    await user.save();
    return user;
  }

  async deleteUser(id, adminId) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'super_admin') throw new ApiError(403, 'Cannot delete super admin');
    await Vendor.findOneAndDelete({ user: id });
    await user.deleteOne();
    return true;
  }

  // Order Management
  async getAllOrders(page, limit, filters) {
    const query = {};
    if (filters.status) query.status = filters.status;

    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find(query).populate('user', 'name email').populate('vendor', 'businessName').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Order.countDocuments(query)
    ]);

    return { orders, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async getOrderById(id) {
    const order = await Order.findById(id).populate('user', 'name email').populate('vendor', 'businessName');
    if (!order) throw new ApiError(404, 'Order not found');
    return order;
  }

  async updateOrderStatus(id, status, adminId) {
    const order = await Order.findById(id);
    if (!order) throw new ApiError(404, 'Order not found');
    order.status = status;
    await order.save();
    return order;
  }

  // Product Management
  async getAllProducts(page, limit, filters) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query).populate('category', 'name').populate('vendor', 'name').skip(skip).limit(limit).sort({ createdAt: -1 }),
      Product.countDocuments(query)
    ]);

    return { products, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async updateProductStatus(id, status, rejectionReason, adminId) {
    const product = await Product.findById(id);
    if (!product) throw new ApiError(404, 'Product not found');
    product.status = status;
    if (rejectionReason) product.rejectionReason = rejectionReason;
    await product.save();
    return product;
  }
}

module.exports = new AdminService();