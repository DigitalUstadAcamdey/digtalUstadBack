const User = require('../models/userModel')
const Subscription = require("../models/subscriptionModel");
const cron =require('node-cron');
const config = require('../config/config');
// this cron to check if the user subscription is still valid or expired and update the status field in subscription collection

// runs every 00:00 of each day => `0 0 * * *`
cron.schedule(config.subscriptionCheck, async () => {
  try {
    const now = new Date();

    // expire subscriptions
    const result = await Subscription.updateMany(
      {
        status: "active",
        endDate: { $lt: now },
      },
      { $set: { status: "expired" } }
    );

    console.log(`Expired subscriptions: ${result.modifiedCount}`);

    // remove expired courses from users
    const expiredSubs = await Subscription.find({
      status: "expired",
    });

    for (const sub of expiredSubs) {
      await User.findByIdAndUpdate(sub.user, {
        $pull: { enrolledCourses: { $in: sub.courses } },
      });
    }
  } catch (err) {
    console.error("Error in subscription cron:", err);
  }
});

