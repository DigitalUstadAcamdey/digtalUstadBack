const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const Notification = require("../models/notifcationModel");
const User = require("../models/userModel");

// make notification as read
exports.markAsRead = catchAsync(async (req, res, next) => {
  const notificationId = req.params.id;
  const notification = await Notification.findByIdAndUpdate(notificationId, { isRead: true }, { new: true });
    if (!notification) {
        return next(new AppError("الإشعار غير موجود", 404));
    }
    res.status(200).json({
      status: "success",
      data: {
        notification,
      },
    });
});
// get all notifications for a user
exports.getUserNotifications = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 });
    res.status(200).json({
      status: "success",
      results: notifications.length,
      data: {
        notifications,
      },
    });
});

