const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  instructor: { type: Schema.Types.ObjectId, ref: "User", required: true }, // إشارة إلى المدرس
  videos: [{ type: Schema.Types.ObjectId, ref: "Video", required: true }], // فيديوهات الدورة
  price: { type: Number, default: 0 }, // إذا كانت الدورة مدفوعة
  category: { type: String },
  duration: Number, // مدة الدورة الكاملة
  publishedDate: { type: Date, default: Date.now }, // تاريخ النشر
  studentsCount: { type: Number, default: 0 },
  imageCover: String,
  enrolledStudents: {
    type: [{ type: Schema.Types.ObjectId, ref: "User" }],
    default: [],
  },
  materials: [
    {
      filePath: { type: String, required: true }, // URL للملف
      fileName: { type: String, required: true }, // اسم الملف الأصلي
    },
  ],
  reviews: [
    {
      type: Schema.Types.ObjectId,
      ref: "Review",
    },
  ],
  numberRatings: { type: Number, default: 0 },
  avgRatings: {
    type: Number,
    min: [1, "يجب أن يكون التقييم أكبر أو يساوي 1"],
    max: [5, "يجب أن يكون التقييم أقل أو يساوي 5"],
    default: 4,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

courseSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

courseSchema.methods.updateStudentsCount = async function () {
  this.studentsCount = this.enrolledStudents.length; // تحديث عدد الطلاب المسجلين
  await this.save();
};

const Course = mongoose.model("Course", courseSchema);
module.exports = Course;
