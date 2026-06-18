const User = require('../models/User.model');
const Vendor = require('../models/vendor.model');
const Session = require('../models/Session.model');
const bcrypt = require('bcryptjs');
const { generateTokens, verifyRefreshToken } = require('../utils/jwt.util');
const otpService = require('./otp.service');
const emailService = require('./email.service');
const ApiError = require('../utils/ApiError');

class AuthService {
  async register(userData, ipAddress, userAgent) {
    const { name, email, password, phone, role = 'customer' } = userData;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ApiError(400, 'User already exists with this email');
    }

    // Hash password manually
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with role
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      phone: phone || null,
      role, // Set role from request
    });

    // If role is vendor, create vendor record
    if (role === 'vendor') {
      await Vendor.create({
        user: user._id,
        businessName: name,
        businessEmail: email,
        businessPhone: phone || null,
        status: 'pending', // Vendor approval pending
      });
    }

    // Generate OTP and send email
    const { otp } = await otpService.createOtp(user.email, 'email_verify');
    await emailService.sendVerificationEmail(user.email, user.name, otp);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Create session
    await Session.create({
      user: user._id,
      refreshToken,
      deviceId: `${ipAddress}_${userAgent}`,
      deviceName: userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(email, password, ipAddress, userAgent) {
    // Get user with password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check account lock
    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
      throw new ApiError(403, 'Account locked. Please try again later');
    }

    // Check password - ✅ FIXED: using await properly
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      
      if (user.failedLoginAttempts >= 5) {
        user.accountLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      }
      
      await user.save();
      throw new ApiError(401, 'Invalid credentials');
    }

    // Reset failed attempts on successful login
    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    await user.save();

    // Check if email is verified
    if (!user.isEmailVerified) {
      const { otp } = await otpService.createOtp(user.email, 'email_verify');
      await emailService.sendVerificationEmail(user.email, user.name, otp);
      throw new ApiError(403, 'Email not verified. New OTP sent to your email');
    }

    // Check account status
    if (user.status !== 'active') {
      throw new ApiError(403, `Account is ${user.status}`);
    }

    // Check if vendor is approved (for vendor role)
    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: user._id });
      if (vendor && vendor.status === 'pending') {
        throw new ApiError(403, 'Your vendor account is pending approval by admin');
      }
      if (vendor && vendor.status === 'rejected') {
        throw new ApiError(403, 'Your vendor application has been rejected');
      }
      if (vendor && vendor.status === 'suspended') {
        throw new ApiError(403, 'Your vendor account has been suspended');
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id, user.role);

    // Create session
    await Session.create({
      user: user._id,
      refreshToken,
      deviceId: `${ipAddress}_${userAgent}`,
      deviceName: userAgent,
      ipAddress,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
         permissions: user.permissions || [],
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken) {
    if (!refreshToken) {
      throw new ApiError(401, 'No refresh token provided');
    }

    const decoded = verifyRefreshToken(refreshToken);
    
    const session = await Session.findOne({
      refreshToken,
      isActive: true,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id, user.role);

    session.refreshToken = newRefreshToken;
    session.lastActiveAt = new Date();
    await session.save();

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken) {
    if (refreshToken) {
      await Session.findOneAndDelete({ refreshToken });
    }
    return true;
  }

  async verifyEmail(email, otp) {
    await otpService.verifyOtp(email, otp, 'email_verify');
    
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.status = 'active';
    await user.save();

    return true;
  }

  async resendVerificationOtp(email) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    if (user.isEmailVerified) {
      throw new ApiError(400, 'Email already verified');
    }

    const { otp } = await otpService.createOtp(email, 'email_verify');
    await emailService.sendVerificationEmail(email, user.name, otp);
    
    return true;
  }

  async forgotPassword(email) {
    const user = await User.findOne({ email });
    if (!user) {
      return true;
    }

    const { otp } = await otpService.createOtp(email, 'forgot_password');
    await emailService.sendPasswordResetEmail(email, user.name, otp);
    
    return true;
  }

  async resetPassword(email, otp, newPassword) {
    await otpService.verifyOtp(email, otp, 'forgot_password');
    
    const user = await User.findOne({ email });
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    // Hash new password manually
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    // Delete all sessions for this user
    await Session.deleteMany({ user: user._id });

    return true;
  }
}

module.exports = new AuthService();