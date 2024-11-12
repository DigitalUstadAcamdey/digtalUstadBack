const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

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

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
  return resetToken;
};

userSchema.methods.calculateCompletion = function (courseId) {
  const progress = this.progress.find(
    (p) => p.course.toString() === courseId.toString()
  );

  if (!progress) return 0;

  const totalVideos = progress.completedVideos.length;
  const totalCourseVideos = progress.course.videos.length; // assuming that the course object is populated with videos

  if (totalCourseVideos === 0) return 0;

  const percentage = (totalVideos / totalCourseVideos) * 100;
  return Math.round(percentage);
};

// دالة لتحديث التقدم في الكورس
userSchema.methods.updateProgress = async function (courseId, videoId) {
  const progress = this.progress.find(
    (p) => p.course.toString() === courseId.toString()
  );

  if (!progress) {
    // إذا لم يكن الطالب قد بدأ الكورس، نقوم بإنشاء سجل جديد
    this.progress.push({
      course: courseId,
      completedVideos: [videoId],
    });
  } else {
    // إذا كان قد بدأ الكورس، نضيف الفيديو الجديد إلى completedVideos
    if (!progress.completedVideos.includes(videoId)) {
      progress.completedVideos.push(videoId);
    }
  }

  // إعادة حساب نسبة التقدم
  progress.completionPercentage = this.calculateCompletion(courseId);

  // حفظ التحديثات في قاعدة البيانات
  await this.save();
};

const User = mongoose.model("User", userSchema);

module.exports = User;
