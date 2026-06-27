const userService = require('../services/user.service');
const ApiResponse = require('../utils/ApiResponse');

class UserController {
  // ── Get profile ────────────────────────────────────────────────────────────
  async getProfile(req, res, next) {
    try {
      const user = await userService.getProfile(req.user._id);
      res.status(200).json(ApiResponse.success('Profile fetched successfully', { user }));
    } catch (error) { next(error); }
  }

  // ── Update profile ─────────────────────────────────────────────────────────
  async updateProfile(req, res, next) {
    try {
      const user = await userService.updateProfile(req.user._id, req.body);
      res.status(200).json(ApiResponse.success('Profile updated successfully', { user }));
    } catch (error) { next(error); }
  }

  // ── Request email change (send OTP to new email) ───────────────────────────
  async requestEmailChange(req, res, next) {
    try {
      const { newEmail } = req.body;
      const result = await userService.requestEmailChange(req.user._id, newEmail);
      res.status(200).json(ApiResponse.success(result.message, result));
    } catch (error) { next(error); }
  }

  // ── Verify email change OTP ────────────────────────────────────────────────
  async verifyEmailChange(req, res, next) {
    try {
      const { newEmail, otp } = req.body;
      const user = await userService.verifyEmailChange(req.user._id, newEmail, otp);
      res.status(200).json(ApiResponse.success('Email updated successfully', { user }));
    } catch (error) { next(error); }
  }

  // ── Change password ────────────────────────────────────────────────────────
  async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      await userService.changePassword(req.user._id, currentPassword, newPassword);
      res.status(200).json(ApiResponse.success('Password changed successfully'));
    } catch (error) { next(error); }
  }

  // ── Get addresses ──────────────────────────────────────────────────────────
  async getAddresses(req, res, next) {
    try {
      const addresses = await userService.getAddresses(req.user._id);
      res.status(200).json(ApiResponse.success('Addresses fetched successfully', { addresses }));
    } catch (error) { next(error); }
  }

  // ── Add address ────────────────────────────────────────────────────────────
  async addAddress(req, res, next) {
    try {
      const address = await userService.addAddress(req.user._id, req.body);
      res.status(201).json(ApiResponse.success('Address added successfully', { address }));
    } catch (error) { next(error); }
  }

  // ── Update address ─────────────────────────────────────────────────────────
  async updateAddress(req, res, next) {
    try {
      const { addressId } = req.params;
      const address = await userService.updateAddress(req.user._id, addressId, req.body);
      res.status(200).json(ApiResponse.success('Address updated successfully', { address }));
    } catch (error) { next(error); }
  }

  // ── Delete address ─────────────────────────────────────────────────────────
  async deleteAddress(req, res, next) {
    try {
      const { addressId } = req.params;
      await userService.deleteAddress(req.user._id, addressId);
      res.status(200).json(ApiResponse.success('Address deleted successfully'));
    } catch (error) { next(error); }
  }

  // ── Get user orders ────────────────────────────────────────────────────────
  async getUserOrders(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const result = await userService.getUserOrders(req.user._id, parseInt(page), parseInt(limit));
      res.status(200).json(ApiResponse.success('Orders fetched successfully', result));
    } catch (error) { next(error); }
  }

  // ── Get user stats ─────────────────────────────────────────────────────────
  async getUserStats(req, res, next) {
    try {
      const stats = await userService.getUserStats(req.user._id);
      res.status(200).json(ApiResponse.success('Stats fetched successfully', stats));
    } catch (error) { next(error); }
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async deleteAccount(req, res, next) {
    try {
      const { password } = req.body;
      if (!password) {
        return res.status(400).json(ApiResponse.error('Password is required to delete account'));
      }
      await userService.deleteAccount(req.user._id, password);
      // Clear auth cookie if used
      res.clearCookie('token');
      res.status(200).json(ApiResponse.success('Account deleted successfully'));
    } catch (error) { next(error); }
  }
}

module.exports = new UserController();