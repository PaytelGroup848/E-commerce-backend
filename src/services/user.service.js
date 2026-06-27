const User = require('../models/User.model');
const Order = require('../models/order.model');
const OtpToken = require('../models/Otptoken.model');
const Vendor = require('../models/vendor.model');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

// ── Helper: generate 6-digit OTP ─────────────────────────────────────────────
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ── Helper: hash OTP ─────────────────────────────────────────────────────────
const hashOTP = (otp) => crypto.createHash('sha256').update(otp).digest('hex');

class UserService {
  // ── Get profile ────────────────────────────────────────────────────────────
  async getProfile(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  // ── Update profile (name, phone, avatar only) ──────────────────────────────
  // Email change is separate (needs OTP verification)
  async updateProfile(userId, updateData) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const allowedUpdates = ['name', 'phone', 'avatar', 'preferences'];
    const updates = {};
    for (const field of allowedUpdates) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    }

    // Validate name
    if (updates.name !== undefined) {
      const trimmed = updates.name.trim();
      if (!trimmed || trimmed.length < 2) throw new ApiError(400, 'Name must be at least 2 characters');
      if (trimmed.length > 100) throw new ApiError(400, 'Name cannot exceed 100 characters');
      updates.name = trimmed;
    }

    // Validate phone
    if (updates.phone !== undefined && updates.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      const cleaned = updates.phone.replace(/\D/g, '');
      if (!phoneRegex.test(cleaned)) throw new ApiError(400, 'Invalid Indian phone number');
      updates.phone = cleaned;
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    return updatedUser;
  }

  // ── Request email change — sends OTP to NEW email ──────────────────────────
  async requestEmailChange(userId, newEmail) {
    const email = newEmail?.trim()?.toLowerCase();
    if (!email) throw new ApiError(400, 'New email is required');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new ApiError(400, 'Invalid email address');

    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.email === email) throw new ApiError(400, 'New email is same as current email');

    // Check if email already taken
    const existing = await User.findOne({ email, _id: { $ne: userId } });
    if (existing) throw new ApiError(409, 'This email is already registered');

    // Delete old OTPs for this user+type
    await OtpToken.deleteMany({ email: userId.toString(), type: 'email_verify' });

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    // Store: we use userId as "email" field to link to user, and store newEmail in a meta way
    // We'll store newEmail encoded in a special way using the email field
    await OtpToken.create({
      email: `emailchange:${userId}:${email}`,   // custom key to identify email-change OTPs
      otp: hashedOtp,
      type: 'email_verify',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    // TODO: Send real email — for now return OTP in dev mode
    const isDev = process.env.NODE_ENV === 'development';

    return {
      message: `OTP sent to ${email}`,
      ...(isDev && { otp }), // Only in development
    };
  }

  // ── Verify email change OTP and update email ───────────────────────────────
  async verifyEmailChange(userId, newEmail, otp) {
    const email = newEmail?.trim()?.toLowerCase();
    if (!email || !otp) throw new ApiError(400, 'Email and OTP are required');

    const key = `emailchange:${userId}:${email}`;
    const otpRecord = await OtpToken.findOne({ email: key, type: 'email_verify' });

    if (!otpRecord) throw new ApiError(400, 'OTP not found or expired. Please request a new one');
    if (otpRecord.isUsed) throw new ApiError(400, 'OTP already used');
    if (otpRecord.expiresAt < new Date()) throw new ApiError(400, 'OTP has expired');
    if (otpRecord.attempts >= 5) throw new ApiError(429, 'Too many attempts. Request a new OTP');

    const hashedInput = hashOTP(otp.toString());
    if (hashedInput !== otpRecord.otp) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      const remaining = 5 - otpRecord.attempts;
      throw new ApiError(400, `Invalid OTP. ${remaining} attempt(s) remaining`);
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    // Update email
    const user = await User.findByIdAndUpdate(
      userId,
      { email, isEmailVerified: true, emailVerifiedAt: new Date() },
      { new: true }
    ).select('-password');

    if (!user) throw new ApiError(404, 'User not found');

    // Clean up OTP
    await OtpToken.deleteMany({ email: key });

    return user;
  }

  // ── Change password ────────────────────────────────────────────────────────
  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) throw new ApiError(400, 'Both passwords are required');
    if (newPassword.length < 8) throw new ApiError(400, 'New password must be at least 8 characters');
    if (currentPassword === newPassword) throw new ApiError(400, 'New password must be different');

    const user = await User.findById(userId).select('+password');
    if (!user) throw new ApiError(404, 'User not found');

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) throw new ApiError(401, 'Current password is incorrect');

    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    user.passwordChangedAt = new Date();
    await user.save();

    return true;
  }

  // ── Get addresses ──────────────────────────────────────────────────────────
  async getAddresses(userId) {
    const user = await User.findById(userId).select('addresses');
    if (!user) throw new ApiError(404, 'User not found');
    return user.addresses || [];
  }

  // ── Add address ────────────────────────────────────────────────────────────
  async addAddress(userId, addressData) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    if (user.addresses.length >= 5) throw new ApiError(400, 'Maximum 5 addresses allowed');

    // Validate required fields
    const required = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    for (const field of required) {
      if (!addressData[field]?.trim()) {
        throw new ApiError(400, `${field} is required`);
      }
    }

    // Validate phone
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanedPhone = addressData.phone.replace(/\D/g, '');
    if (!phoneRegex.test(cleanedPhone)) throw new ApiError(400, 'Invalid phone number');

    // Validate pincode
    if (!/^\d{6}$/.test(addressData.pincode.trim())) throw new ApiError(400, 'Invalid 6-digit pincode');

    // If first address or isDefault requested
    if (addressData.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((a) => { a.isDefault = false; });
      addressData.isDefault = true;
    }

    addressData.phone = cleanedPhone;
    user.addresses.push(addressData);
    await user.save();

    return user.addresses[user.addresses.length - 1];
  }

  // ── Update address ─────────────────────────────────────────────────────────
  async updateAddress(userId, addressId, updateData) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const address = user.addresses.id(addressId);
    if (!address) throw new ApiError(404, 'Address not found');

    // Validate phone if provided
    if (updateData.phone) {
      const phoneRegex = /^[6-9]\d{9}$/;
      const cleaned = updateData.phone.replace(/\D/g, '');
      if (!phoneRegex.test(cleaned)) throw new ApiError(400, 'Invalid phone number');
      updateData.phone = cleaned;
    }

    // Validate pincode if provided
    if (updateData.pincode && !/^\d{6}$/.test(updateData.pincode.trim())) {
      throw new ApiError(400, 'Invalid 6-digit pincode');
    }

    const allowedFields = ['label', 'fullName', 'phone', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'country', 'isDefault'];
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) address[field] = updateData[field];
    }

    if (updateData.isDefault) {
      user.addresses.forEach((a) => {
        if (a._id.toString() !== addressId) a.isDefault = false;
      });
    }

    await user.save();
    return address;
  }

  // ── Delete address ─────────────────────────────────────────────────────────
  async deleteAddress(userId, addressId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');

    const address = user.addresses.id(addressId);
    if (!address) throw new ApiError(404, 'Address not found');

    const wasDefault = address.isDefault;
    address.deleteOne();

    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();
    return true;
  }

  // ── Get user orders ────────────────────────────────────────────────────────
  async getUserOrders(userId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('orderId status total items createdAt payment shippingAddress'),
      Order.countDocuments({ user: userId }),
    ]);

    return {
      orders,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // ── Get user stats ─────────────────────────────────────────────────────────
  async getUserStats(userId) {
    const [totalOrders, spentAgg, user] = await Promise.all([
      Order.countDocuments({ user: userId }),
      Order.aggregate([
        { $match: { user: userId, status: 'delivered' } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      User.findById(userId).select('createdAt'),
    ]);

    return {
      totalOrders,
      totalSpent: spentAgg[0]?.total || 0,
      memberSince: user?.createdAt,
    };
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async deleteAccount(userId, password) {
    const user = await User.findById(userId).select('+password');
    if (!user) throw new ApiError(404, 'User not found');

    if (user.role === 'super_admin') throw new ApiError(403, 'Super admin account cannot be deleted');

    const isValid = await user.comparePassword(password);
    if (!isValid) throw new ApiError(401, 'Incorrect password');

    // Delete vendor record if exists
    await Vendor.findOneAndDelete({ user: userId });

    // Delete OTP tokens
    await OtpToken.deleteMany({ email: user.email });

    // Delete user
    await user.deleteOne();

    return true;
  }

  // ── Admin helpers (unchanged) ──────────────────────────────────────────────
  async getUserById(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) throw new ApiError(404, 'User not found');
    return user;
  }

  async getAllUsers(page = 1, limit = 20, filters = {}) {
    const query = {};
    if (filters.role) query.role = filters.role;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { email: { $regex: filters.search, $options: 'i' } },
      ];
    }
    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      User.find(query).select('-password').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);
    return { users, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
  }

  async deleteUser(userId) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'super_admin') throw new ApiError(403, 'Cannot delete super admin');
    await Vendor.findOneAndDelete({ user: userId });
    await user.deleteOne();
    return true;
  }

  async updateUserRole(userId, newRole) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    if (user.role === 'super_admin') throw new ApiError(403, 'Cannot change super admin role');
    user.role = newRole;
    await user.save();
    return user;
  }

  async updateUserStatus(userId, status) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, 'User not found');
    user.status = status;
    await user.save();
    return user;
  }

  async getUserByEmail(email) {
    return User.findOne({ email }).select('-password');
  }

  async isEmailExists(email) {
    return !!(await User.findOne({ email }));
  }

  async updateLastLogin(userId) {
    await User.findByIdAndUpdate(userId, { lastLoginAt: new Date() });
  }
}

module.exports = new UserService();