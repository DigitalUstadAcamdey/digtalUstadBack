const axios = require("axios");
const Course = require("../models/courseModel");
const User = require("../models/userModel");
const TelegramVipAccess = require("../models/telegramVipAccessModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const {
  findActiveAnnualSubscription,
  hasObjectId,
} = require("../utils/subscriptionAccess");
const {
  telegram_bot_token,
  telegram_vip_chat_id,
  telegram_vip_link_expiry_minutes,
} = require("../config/config");

const buildExpiryDate = () => {
  const expiresAt = new Date(
    Date.now() + telegram_vip_link_expiry_minutes * 60 * 1000,
  );

  return {
    expiresAt,
    expireDateUnix: Math.floor(expiresAt.getTime() / 1000),
  };
};

const getCourseTelegramChatId = (course) => {
  if (course.telegramVipEnabled && course.telegramChatId) {
    return course.telegramChatId;
  }

  return telegram_vip_chat_id || null;
};

exports.createVipInviteLink = catchAsync(async (req, res, next) => {
  if (!telegram_bot_token) {
    return next(new AppError("Telegram bot token is not configured", 500));
  }

  const { courseId } = req.params;
  const userId = req.user.id;

  const [user, course, activeAnnualSubscription] = await Promise.all([
    User.findById(userId).select("enrolledCourses"),
    Course.findById(courseId).select("title telegramChatId telegramVipEnabled"),
    findActiveAnnualSubscription(userId).select("_id").lean(),
  ]);

  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }

  const isEnrolled = hasObjectId(user.enrolledCourses, courseId);

  if (!isEnrolled && !activeAnnualSubscription) {
    return next(
      new AppError(
        "يجب التسجيل في الدورة أو امتلاك اشتراك سنوي نشط للحصول على رابط VIP",
        403,
      ),
    );
  }

  const telegramChatId = getCourseTelegramChatId(course);

  if (!telegramChatId) {
    return next(
      new AppError("Telegram VIP is not configured for this course", 400),
    );
  }

  const now = new Date();

  await TelegramVipAccess.updateMany(
    {
      user: userId,
      course: courseId,
      state: "link_issued",
      inviteLinkExpiresAt: { $lte: now },
    },
    {
      $set: {
        state: "expired",
      },
    },
  );

  const activeInvite = await TelegramVipAccess.findOne({
    user: userId,
    course: courseId,
    state: "link_issued",
    inviteLinkExpiresAt: { $gt: now },
  }).sort({ createdAt: -1 });

  if (activeInvite) {
    return res.redirect(303, activeInvite.inviteLink);
  }

  const { expiresAt, expireDateUnix } = buildExpiryDate();

  let telegramResponse;

  try {
    telegramResponse = await axios.post(
      `https://api.telegram.org/bot${telegram_bot_token}/createChatInviteLink`,
      {
        chat_id: telegramChatId,
        member_limit: 1,
        expire_date: expireDateUnix,
        creates_join_request: false,
        name: `course-${courseId}-user-${userId}`,
      },
    );
  } catch (error) {
    const telegramErrorMessage =
      error.response?.data?.description || "فشل في إنشاء رابط تيليجرام";

    return next(new AppError(telegramErrorMessage, 502));
  }

  if (
    !telegramResponse.data?.ok ||
    !telegramResponse.data?.result?.invite_link
  ) {
    return next(new AppError("فشل في إنشاء رابط VIP", 502));
  }

  const inviteLink = telegramResponse.data.result.invite_link;

  await TelegramVipAccess.create({
    user: userId,
    course: courseId,
    telegramChatId,
    inviteLink,
    inviteLinkCreatedAt: now,
    inviteLinkExpiresAt: expiresAt,
    state: "link_issued",
  });

  return res.redirect(303, inviteLink);
});
