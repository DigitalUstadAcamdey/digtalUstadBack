const Coupon = require("../models/couponModel");
const Subscription = require("../models/subscriptionModel");
const User = require("../models/userModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");
const { subscriptionPrice } = require("../config/config");
/**
 * CREATE subscription (1 year)
 * user buys annual subscription
 */
exports.createSubscription = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const user = await User.findById(userId);
  // check if user exists
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  
  const existingSub = await Subscription.findOne({
    user: userId,
    status: "active",
    endDate: { $gt: new Date() },
  });
  // check if already has active subscription
  if (existingSub) {
    return next(new AppError("لديك اشتراك نشط بالفعل", 400));
  }

  const { couponCode } = req.body;
let finalPrice = subscriptionPrice;
// apply coupon 
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode,
    });
    // check coupon 
    if (!coupon) return next(new AppError("الكوبون غير صحيح", 400));
    // check validity
    if (!coupon.isValid())
      return next(new AppError("الكوبون غير صالح أو منتهي", 400));
    // calculate final price
    finalPrice =
      subscriptionPrice - (subscriptionPrice * coupon.discountAsPercentage) / 100;
    // update coupon usage
    coupon.usedCount += 1;
    await coupon.save();
  }

  // simple balance check finalPrice > 0 && user.balance < finalPrice 
  if (!(user.balance >= 0 && user.balance >= finalPrice)) {
    return next(new AppError("ليس لديك رصيد كاف لعمل إشتراك سنوي ", 400));
  }

  // create subscription
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);

  const subscription = await Subscription.create({
    user: userId,
    courses:[],// intially empty
    startDate,
    endDate,
    status: "active",
  });
  // update user balance after successful subscription
  await User.findByIdAndUpdate(
      userId,
      {
        $inc: { balance: -finalPrice },
      },
      {
        new: true,
        runValidators: true,
      }
    );

  res.status(201).json({
    message: "تم إنشاء الاشتراك السنوي بنجاح",
    subscription,
  });
});
/**
 * RENEWAL subscription (1 year)
 * user renewal annual subscription
 */
exports.renewSubscription = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const {subscriptionId} = req.params;
  
  const user = await User.findById(userId);
  // check if user exists
  if (!user) return next(new AppError("المستخدم غير موجود", 404));
  // check if already has  subscription?
 const existingSub = await Subscription.findById(subscriptionId);
  if (!existingSub) {
    return next(new AppError("لا يوجد اشتراك بهذا المعرف", 404));
  }
  // check if belongs to user
  if (existingSub.user.toString() !== userId) {
    return next(new AppError("لا يمكنك تجديد اشتراك ليس لك", 403));
  }
  // check if still active
  if (existingSub.status === "active" && existingSub.endDate > new Date()) {
    return next(new AppError("لديك اشتراك نشط بالفعل", 400));
  }

  // simple balance check
  if (!(user.balance >= 0 && user.balance >= subscriptionPrice)) {
    return next(new AppError("ليس لديك رصيد كاف لعمل إشتراك سنوي ", 400));
  }
  // renew subscription
  const startDate = new Date();
  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 1);
  existingSub.startDate = startDate;
  existingSub.endDate = endDate;
  existingSub.status = "active";
  await existingSub.save();
  const subscription = existingSub;
  // update user balance after successful subscription
  // push the old courses to the renewed subscription
  await User.findByIdAndUpdate(
      userId,
      {
        $inc: { balance: -subscriptionPrice },
        $addToSet: { enrolledCourses: existingSub.courses }
      },
      {
        new: true,
        runValidators: true,
      }
    );
  res.status(201).json({
    message: "تم تجديد الاشتراك السنوي بنجاح",
    subscription,
  });
})
/**
 * GET my subscription
 */
exports.getMySubscription = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const subscription = await Subscription.findOne({ user: userId })
    .sort({ createdAt: -1 });

  if (!subscription) {
    return next(new AppError("لا يوجد اشتراك لهذا المستخدم", 404));
  }

  res.status(200).json({
    message: "تم جلب بيانات الاشتراك بنجاح",
    subscription,
  });
});

/**
 * CANCEL subscription (manual)
 */
exports.cancelSubscription = catchAsync(async (req, res, next) => {
  const userId = req.user.id;

  const subscription = await Subscription.findOne({
    user: userId,
    status: "active",
  });

  if (!subscription) {
    return next(new AppError("لا يوجد اشتراك نشط", 400));
  }

  subscription.status = "cancelled";
  await subscription.save();

  res.status(200).json({
    message: "تم إلغاء الاشتراك بنجاح",
  });
});