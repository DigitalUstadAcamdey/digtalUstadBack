const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const commentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", required: true }, // الدورة
  video: { type: Schema.Types.ObjectId, ref: "Video", required: false }, // الفيديو
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  replies: [
    {
      user: { type: Schema.Types.ObjectId, ref: "User" },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
});

const Comment = mongoose.model("Comment", commentSchema);

module.exports = Comment;
