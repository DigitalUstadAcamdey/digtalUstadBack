const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ticketSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String },
    description: { type: String, required: true },
  },
  { timestamps: true }
);

const Ticket = mongoose.model("Ticket", ticketSchema);

module.exports = Ticket;
