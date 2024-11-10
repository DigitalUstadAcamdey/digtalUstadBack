const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    required: function () {
      return !this.githubId; // إذا لم يكن تسجيل عبر GitHub، اجعل الحقل مطلوبًا
    },
  },
  email: {
    type: String,
    required: function () {
      return !this.googleId; // اجعل البريد الإلكتروني مطلوبًا للتسجيل المحلي فقط
    },
  },
  password: {
    type: String,
    required: function () {
      return !this.googleId; // اجعل كلمة المرور مطلوبة للتسجيل المحلي فقط
    },
    minlength: [6, "كلمة المرور يجب أن تكون على الأقل 6 أحرف"],
  },
  passwordConfirm: {
    type: String,
    required: function () {
      return !this.googleId;
    },
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: "كلمة السر غير متطابقة",
    },
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  thumbnail: {
    type: String,
  },
  enrolledCourses: [{ type: Schema.Types.ObjectId, ref: "Course" }],
  progress: [
    {
      course: { type: Schema.Types.ObjectId, ref: "Course" },
      completedVideos: [{ type: Schema.Types.ObjectId, ref: "Video" }],
    },
  ],
  role: {
    type: String,
    enum: ["student", "teacher", "admin"],
    default: "student",
  },
  publishedCourses: [
    {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
  ],
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  active: {
    type: Boolean,
    default: true,
  },
  resetPasswordExpires: {
    type: Date,
    default: null,
    select: false,
  },
  resetPasswordToken: {
    type: String,
    default: null,
    select: false,
  },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordConfirm = undefined;
  next();
});

const User = mongoose.model("User", userSchema);

module.exports = User;
