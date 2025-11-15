const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const notifcationSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: "Course",
    required: true,
  },
  courseImage: {
    type: String,
    required: true,
  },
  lessonNumber: {
    type: Number,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isRead: {
    type: Boolean,
    default: false,
    required: true,
  },
  sectionId: {
    type: Schema.Types.ObjectId,
    ref: "Section",
    required: true,
  },
  videoId: {
    type: Schema.Types.ObjectId,
    ref: "Video",
    required: true,
  },
});

notifcationSchema.pre('save',function(){

}
)

const Notification = mongoose.model("Notification", notifcationSchema);

module.exports = Notification;
