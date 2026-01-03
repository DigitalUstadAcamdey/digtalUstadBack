const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subscriptionSchema = new Schema( {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    courses: [
      {
        type: Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
  },
  { timestamps: true });

const Subscription = mongoose.model('Subscription',subscriptionSchema)

module.exports =Subscription