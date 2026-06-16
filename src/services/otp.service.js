const bcrypt = require('bcryptjs');
const OtpToken = require('../models/Otptoken.model');
const { generateOTP, generateExpiryTime } = require('../utils/otp.util');

class OtpService {
  async createOtp(email, type) {
    // Delete existing OTPs for this email and type
    await OtpToken.deleteMany({ email, type });

    // For testing, use a fixed OTP "123456"
    const isTestMode = process.env.NODE_ENV === 'development';
    const otp = isTestMode ? '123456' : generateOTP(6);
    
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = generateExpiryTime(10);

    const otpToken = await OtpToken.create({
      email,
      otp: hashedOtp,
      type,
      expiresAt,
    });

    console.log(`\n🔐 ===== OTP GENERATED =====`);
    console.log(`Email: ${email}`);
    console.log(`Type: ${type}`);
    console.log(`OTP: ${otp}`);
    console.log(`==========================\n`);

    return { otp, otpToken };
  }

  async verifyOtp(email, otp, type) {
    const otpRecord = await OtpToken.findOne({
      email,
      type,
      isUsed: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord) {
      throw new Error('OTP expired or not found');
    }

    if (otpRecord.attempts >= 5) {
      throw new Error('Maximum attempts exceeded. Please request new OTP');
    }

    const isValid = await bcrypt.compare(otp, otpRecord.otp);

    if (!isValid) {
      otpRecord.attempts += 1;
      await otpRecord.save();
      throw new Error('Invalid OTP');
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await otpRecord.save();

    return true;
  }
}

module.exports = new OtpService();