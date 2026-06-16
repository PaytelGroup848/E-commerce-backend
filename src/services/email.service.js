const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // For development, create ethereal account automatically
    this.initTransporter();
  }

  async initTransporter() {
    try {
      // Create ethereal account for testing (no real credentials needed)
      const testAccount = await nodemailer.createTestAccount();
      
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      
      console.log('📧 Test email account created:', testAccount.user);
    } catch (error) {
      console.error('Failed to create test email account:', error);
      // Create a dummy transporter that logs instead of sending
      this.transporter = {
        sendMail: (mailOptions) => {
          console.log('📧 EMAIL WOULD BE SENT:');
          console.log('To:', mailOptions.to);
          console.log('Subject:', mailOptions.subject);
          console.log('OTP:', mailOptions.html.match(/\d{6}/)?.[0] || '123456');
          return Promise.resolve({ messageId: 'dummy-id' });
        }
      };
    }
  }

  async sendEmail(to, subject, html) {
    try {
      if (!this.transporter) {
        await this.initTransporter();
      }
      
      const info = await this.transporter.sendMail({
        from: '"E-Commerce Store" <noreply@ethereal.email>',
        to,
        subject,
        html,
      });
      
      console.log('✅ Email sent:', info.messageId);
      
      // For ethereal, log the preview URL
      if (info.messageId && nodemailer.getTestMessageUrl) {
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(info));
      }
      
      return info;
    } catch (error) {
      console.error('❌ Email error:', error.message);
      // Don't throw error in development, just log it
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 FALLBACK: Would have sent email to:', to);
        console.log('📧 FALLBACK: OTP is in the HTML content above');
        return { messageId: 'fallback-id' };
      }
      throw error;
    }
  }

  async sendVerificationEmail(email, name, otp) {
    const subject = 'Verify Your Email';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to E-Commerce Store!</h2>
        <p>Hello ${name},</p>
        <p>Thank you for registering. Please verify your email address using the OTP below:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't create an account, please ignore this email.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
      </div>
    `;
    
    console.log(`\n📧 ===== VERIFICATION EMAIL =====`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`================================\n`);
    
    return this.sendEmail(email, subject, html);
  }

  async sendPasswordResetEmail(email, name, otp) {
    const subject = 'Reset Your Password';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You requested to reset your password. Use the OTP below to proceed:</p>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
          ${otp}
        </div>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr />
        <p style="color: #666; font-size: 12px;">© ${new Date().getFullYear()} E-Commerce Store. All rights reserved.</p>
      </div>
    `;
    
    console.log(`\n📧 ===== PASSWORD RESET EMAIL =====`);
    console.log(`To: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`===================================\n`);
    
    return this.sendEmail(email, subject, html);
  }
}

module.exports = new EmailService();