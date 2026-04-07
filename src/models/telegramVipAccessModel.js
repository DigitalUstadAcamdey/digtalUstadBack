const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const telegramVipAccessSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    telegramChatId: {
      type: String,
      required: true,
    },
    inviteLink: {
      type: String,
      required: true,
    },
    inviteLinkCreatedAt: {
      type: Date,
      default: Date.now,
    },
    inviteLinkExpiresAt: {
      type: Date,
      required: true,
    },
    inviteLinkUsedAt: {
      type: Date,
      default: null,
    },
    state: {
      type: String,
      enum: ["eligible", "link_issued", "joined", "revoked", "expired"],
      default: "link_issued",
    },
  },
  {
    timestamps: true,
  }
);

telegramVipAccessSchema.index({ user: 1, course: 1, state: 1 });

module.exports = mongoose.model("TelegramVipAccess", telegramVipAccessSchema);
