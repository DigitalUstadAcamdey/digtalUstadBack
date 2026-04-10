const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: [
        "TOP_UP",
        "COURSE_PURCHASE",
        "SUBSCRIPTION_PURCHASE",
        "SUBSCRIPTION_RENEWAL",
      ],
      default: "TOP_UP",
    },

    chargilyCheckoutId: {
      type: String,
      default: null,
      index: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "SUCCESS", "FAILED"],
      default: "PENDING",
    },

    paymentMethod: {
      type: String, // CIB / EDAHABIA
      enum: ["CIB", "EDAHABIA", "MANUAL", "BALANCE"],
      default: null,
    },

    description: {
      type: String,
      default: null,
    },

    metadata: {
      type: Object, // بيانات إضافية من Chargily
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

const Transaction = mongoose.model("Transaction", TransactionSchema);
module.exports = Transaction;
