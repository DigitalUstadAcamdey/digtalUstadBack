const User = require("../models/userModel");
const Course = require("../models/courseModel");
const Subscription = require("../models/subscriptionModel");
const AppSetting = require("../models/appSettingModel");

const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const {
  SUBSCRIPTION_PRICE_KEY,
  getAnnualSubscriptionPrice,
  normalizeSubscriptionPriceInput,
} = require("../utils/subscriptionPrice");

exports.getAnalytics = catchAsync(async (req, res, next) => {
  const allUsers = await User.countDocuments();
  const teachers = await User.countDocuments({
    role: "teacher",
  });
  const allCourses = await Course.countDocuments();
  const annualSubscribers = await Subscription.countDocuments({
    status: "active",
    endDate: { $gt: new Date() },
  });
  const courses = await Course.find().select("price studentsCount").exec();

  const totalRevenue = courses.reduce((sum, course) => {
    return sum + (course.price || 0) * (course.studentsCount || 0);
  }, 0);

  const totalEnrollments = courses.reduce((sum, course) => {
    return sum + course.studentsCount;
  }, 0);
  const topCourse = await Course.findOne()
    .sort({ studentsCount: -1 })
    .select("title studentsCount price");

  res.status(200).json({
    message: "تم جلب البيانات بنجاح",
    users: allUsers,
    courses: allCourses,
    teachers,
    annualSubscribers,
    totalRevenue,
    totalEnrollments,
    topCourse,
  });
});

exports.getSubscriptionPrice = catchAsync(async (req, res, next) => {
  const price = await getAnnualSubscriptionPrice();

  res.status(200).json({
    message: "تم جلب سعر الاشتراك السنوي بنجاح",
    yearlySubscriptionPrice: price,
  });
});

exports.updateSubscriptionPrice = catchAsync(async (req, res, next) => {
  const { yearlySubscriptionPrice } = req.body;

  if (yearlySubscriptionPrice === undefined) {
    return next(new AppError("يرجى إدخال سعر الاشتراك السنوي", 400));
  }

  const normalizedPrice = normalizeSubscriptionPriceInput(
    yearlySubscriptionPrice,
  );

  const setting = await AppSetting.findOneAndUpdate(
    { key: SUBSCRIPTION_PRICE_KEY },
    {
      key: SUBSCRIPTION_PRICE_KEY,
      value: normalizedPrice,
      updatedBy: req.user.id,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  );

  res.status(200).json({
    message: "تم تحديث سعر الاشتراك السنوي بنجاح",
    yearlySubscriptionPrice: setting.value,
  });
});
