const mongoose = require("mongoose");
const validator = require("validator");
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
      return !this.githubId && !this.googleId; // اجعل البريد الإلكتروني مطلوبًا للتسجيل المحلي فقط
    },
  },
  password: {
    type: String,
    required: function () {
      return !this.githubId && !this.googleId; // اجعل كلمة المرور مطلوبة للتسجيل المحلي فقط
    },
    minlength: [6, "كلمة المرور يجب أن تكون على الأقل 6 أحرف"],
  },
  passwordConfirm: {
    type: String,
    required: function () {
      return !this.githubId && !this.googleId;
    },
    validate: {
      validator: function (value) {
        return value === this.password;
      },
      message: "كلمة السر غير متطابقة",
    },
  },
  githubId: {
    type: String,
    unique: true,
    sparse: true,
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
  lastLogin: {
    type: Date,
    default: Date.now,
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
