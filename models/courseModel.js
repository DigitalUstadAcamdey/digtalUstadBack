const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: Schema.Types.ObjectId, ref: "User", required: true }, // إشارة إلى المدرس
  // videos: [{ type: Schema.Types.ObjectId, ref: "Video" }], // فيديوهات الدورة
  price: { type: Number, default: 0 }, // إذا كانت الدورة مدفوعة
  category: { type: String },
  duration: Number, // مدة الدورة الكاملة
  publishedDate: { type: Date, default: Date.now }, // تاريخ النشر
  studentsCount: { type: Number, default: 0 }, // عدد الطلاب المسجلين
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

courseSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
