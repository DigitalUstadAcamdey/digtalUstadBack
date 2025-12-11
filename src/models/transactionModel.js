const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },

  amount: { 
    type: Number, 
    required: true 
  },

  chargilyCheckoutId: {
    type: String,
    required: true
  },

  status: {
    type: String,
    enum: ["PENDING", "SUCCESS", "FAILED"],
    default: "PENDING"
  },

  paymentMethod: {
    type: String, // CIB / EDAHABIA
  },

  metadata: {
    type: Object, // بيانات إضافية من Chargily
    default:null
  },
},{
    timestamps:true
});

const Transaction =  mongoose.model("Transaction", TransactionSchema);
module.exports =  Transaction
