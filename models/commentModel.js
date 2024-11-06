const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true }, // المستخدم الذي كتب التعليق
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // الدورة التي كتب عليها التعليق
  content: { type: String, required: true }, // محتوى التعليق
  createdAt: { type: Date, default: Date.now },
});

const Comment = mongoose.model("Comment", commentSchema);
module.exports = Comment;
