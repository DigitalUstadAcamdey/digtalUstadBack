// createAdmin.js
const dotenv = require("dotenv");
const connectToDb = require("../utils/connectDb");

// import models to ensure they are registered with mongoose

require("../models/courseModel");
require("../models/videoModel");
require("../models/notifcationModel");
const User = require("../models/userModel");

dotenv.config();

(async () => {
  try {
    await connectToDb();

    // 🔑 بيانات Admin أولي
    const username = process.env.USERNAME;
    const email = process.env.EMAIL;
    const password = process.env.PASSWORD; // غيرها بكلمة سر قوية

    // تحقق إذا يوجد Admin مسبقًا
    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("⚠️ Admin already exists:", existingAdmin.email);
      process.exit();
    }

    // إنشاء Admin جديد
    const admin = await User.create({
      username,
      email,
      password,
      passwordConfirm: password,
      role: "admin",
    });

    console.log("✅ Admin created successfully:");
    console.log({
      username: admin.username,
      email: admin.email,
      role: admin.role,
      password,
    });
    console.log("admin", admin);

    process.exit();
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    process.exit(1);
  }
})();
