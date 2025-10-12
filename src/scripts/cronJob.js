const connectToDb = require("../utils/connectDb");
const dotenv = require("dotenv");
const Notification = require("../models/notifcationModel");
const Ticket = require("../models/ticketModel");
const User = require("../models/userModel");

dotenv.config();

async function removeOldNotificationsAndTickets() {
  try {
    await connectToDb();

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    // remove notifications older than 2 days
    await Notification.deleteMany({ createdAt: { $lt: twoDaysAgo } });

    // remove tickets older than 2 days
    await Ticket.deleteMany({ createdAt: { $lt: twoDaysAgo } });

    // remove notifications older than 2 days from users
    const users = await User.find({});
    for (const user of users) {
      user.notifications = user.notifications.filter(
        (notif) => notif.createdAt >= twoDaysAgo
      );
      await user.save();
    }

    console.log("✅ Cleanup done!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error in cleanup:", err);
    process.exit(1);
  }
}

removeOldNotificationsAndTickets();
