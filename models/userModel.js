const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Video = require("./videoModel");

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
  phoneNumber: String,
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
      percentage: { type: Number, default: 0 },
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

userSchema.methods.updateProgress = async function (courseId, videoId) {
  const existingCourse = this.progress.find(
    (course) => course.course.toString() === courseId.toString()
  );

  if (existingCourse) {
    // تحقق إذا كان الفيديو موجودًا مسبقًا
    if (!existingCourse.completedVideos.includes(videoId)) {
      existingCourse.completedVideos.push(videoId);
    }
  } else {
    // أضف دورة جديدة إذا لم تكن موجودة
    const progress = {
      course: courseId,
      completedVideos: [videoId],
      percentage: 0,
    };
    this.progress.push(progress);
  }
  // حساب نسبة التقدم

  const course = await mongoose.model("Course").findById(courseId);
  if (course && course.videos.length > 0) {
    // إذا كانت الدورة تحتوي على فيديوهات
    const courseProgress =
      existingCourse ||
      this.progress.find(
        (course) => course.course.toString() === courseId.toString()
      );

    if (courseProgress) {
      courseProgress.percentage =
        (courseProgress.completedVideos.length / course.videos.length) * 100;
    }
  }

  await this.save({ validateModifiedOnly: true });
};

// تحديث كلمة السر
userSchema.methods.correctPassword = function (currentPassword) {
  return bcrypt.compare(currentPassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;
