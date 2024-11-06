const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const videoSchema = new Schema({
  title: { type: String, required: true },
  description: { type: String },
  videoUrl: { type: String, required: true }, // رابط الفيديو سواء من استضافة خارجية أو محلية
  duration: { type: Number, required: true }, // مدة الفيديو بالدقائق
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // إشارة إلى الدورة التي ينتمي إليها
  order: Number, // ترتيب الفيديو داخل الدورة
  createdAt: { type: Date, default: Date.now },
});

const Video = mongoose.model("Video", videoSchema);
module.exports = Video;
