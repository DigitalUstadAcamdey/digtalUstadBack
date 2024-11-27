const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const videoSchema = new Schema({
  lessonTitle: {
    type: String,
    required: true,
  },
  url: {
    type: String, // هذا سيكون رابط الفيديو المخزن على Cloudinary أو أي خدمة سحابية أخرى
    required: true,
  },
  format: {
    type: String, // مثل MP4, WebM, إلخ
    required: true,
  },
  duration: {
    type: Number,
    // مدة الفيديو بالثواني أو الدقائق
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // معرف المستخدم الذي رفع الفيديو
    required: true,
  },
  // courseId: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: "Course", // إذا كان الفيديو مرتبط بكورس معين
  // },
  isCompleted: {
    type: Boolean,
    default: false, // الفيديو ليس مكتمل
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  publishedDate: { type: Date, default: Date.now },
});

const Video = mongoose.model("Video", videoSchema);
module.exports = Video;
