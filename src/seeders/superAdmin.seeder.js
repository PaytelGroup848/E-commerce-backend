require("dotenv").config();

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const green  = (t) => `\x1b[32m${t}\x1b[0m`;
const red    = (t) => `\x1b[31m${t}\x1b[0m`;
const yellow = (t) => `\x1b[33m${t}\x1b[0m`;
const cyan   = (t) => `\x1b[36m${t}\x1b[0m`;

async function seedSuperAdmin() {
  console.log(cyan("\n Super Admin Seeder Starting...\n"));

  try {
    // Step 1: Connect
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(green(" MongoDB Connected"));

    // Step 2: Env check
    if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
      console.log(red("❌ SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD missing in .env\n"));
      process.exit(1);
    }

    const db = mongoose.connection.db;
    const usersCollection = db.collection("users");
    const settingsCollection = db.collection("platformsettings");

    // Step 3: Already exists?
    const existingAdmin = await usersCollection.findOne({ role: "super_admin" });
    if (existingAdmin) {
      console.log(yellow("  Super Admin already exists!"));
      console.log(yellow(`   Email: ${existingAdmin.email}\n`));
      process.exit(0);
    }

    // Step 4: Password manually hash karo — model bypass
    const hashedPassword = bcrypt.hashSync(process.env.SUPER_ADMIN_PASSWORD, 12);

    // Step 5: Direct insert — model use nahi kar rahe
    const now = new Date();
    const result = await usersCollection.insertOne({
      name: process.env.SUPER_ADMIN_NAME || "Super Admin",
      email: process.env.SUPER_ADMIN_EMAIL,
      password: hashedPassword,
      phone: null,
      role: "super_admin",
      status: "active",
      isEmailVerified: true,
      emailVerifiedAt: now,
      isPhoneVerified: false,
      permissions: [],
      failedLoginAttempts: 0,
      accountLockedUntil: null,
      passwordChangedAt: now,
      addresses: [],
      walletBalance: 0,
      preferences: {
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
      },
      avatar: { url: null, publicId: null },
      lastLoginAt: null,
      lastLoginIp: null,
      createdAt: now,
      updatedAt: now,
      __v: 0,
    });

    console.log(green(" Super Admin created!\n"));
    console.log(`   Name  : ${process.env.SUPER_ADMIN_NAME || "Super Admin"}`);
    console.log(`   Email : ${process.env.SUPER_ADMIN_EMAIL}`);
    console.log(`   ID    : ${result.insertedId}\n`);

    // Step 6: Platform settings
    const existingSettings = await settingsCollection.findOne({
      key: "platform_settings",
    });

    if (!existingSettings) {
      await settingsCollection.insertOne({
        key: "platform_settings",
        store: {
          name: "My eCommerce Store",
          email: "",
          phone: "",
          currency: "INR",
          currencySymbol: "₹",
        },
        vendor: {
          isRegistrationEnabled: true,
          autoApprove: false,
          defaultCommissionRate: 10,
          minWithdrawalAmount: 500,
        },
        order: {
          freeShippingAbove: 999,
          defaultShippingCharge: 79,
          isCODEnabled: true,
          codCharge: 0,
          cancellationWindowHours: 24,
          returnWindowDays: 7,
        },
        updatedBy: result.insertedId,
        createdAt: now,
        updatedAt: now,
      });
      console.log(green(" Platform settings created\n"));
    }

    console.log(green(" Done!\n"));
    console.log(cyan("   Login with:"));
    console.log(`   Email    : ${process.env.SUPER_ADMIN_EMAIL}`);
    console.log(`   Password : ${process.env.SUPER_ADMIN_PASSWORD}`);
    console.log(yellow("\n    Change password after first login!\n"));

  } catch (error) {
    console.log(red(`\n❌ Seeder failed: ${error.message}\n`));
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log(cyan("MongoDB connection closed\n"));
    process.exit(0);
  }
}

seedSuperAdmin();