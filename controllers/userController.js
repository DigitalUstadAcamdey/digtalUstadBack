const User = require("../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");

//

exports.updateMe = catchAsync(async (req, res, next) => {
  if (
    req.body.role ||
    req.body.password ||
    req.body.progress ||
    req.body.enrolledCourses
  ) {
    return next(new AppError("هذا النطاق غير مخصص لتحديث هذه ", 400));
  }
  const user = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    message: "تم التحديث بنجاح",
    user,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user.id,
    {
      active: false,
    },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(204).json({
    message: "تم التحديث بنجاح",
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(200).json({
    message: "نجاح ",
    user,
  });
});

//for Admins
exports.getAllUsers = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("ليس لديك الصلاحية للوصول إلى هذه الصفحة", 403));
  }
  const users = await User.find();
  res.status(200).json({
    message: "success",
    result: users.length,
    users: users,
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("ليس لديك الصلاحية للوصول إلى هذه الصفحة", 403));
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(200).json({
    message: "نجاح ",
    user,
  });
});

exports.createUser = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("ليس لديك الصلاحية للوصول إلى هذه الصفحة", 403));
  }
  const newUser = await User.create(req.body);
  res.status(201).json({
    message: "تم التسجيل بنجاح",
    user: newUser,
  });
});

exports.deleteUser = catchAsync(async (req, res, next) => {
  if (req.user.role !== "admin") {
    return next(new AppError("ليس لديك الصلاحية للوصول إلى هذه الصفحة", 403));
  }
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  res.status(204).json({
    message: "تم الحذف بنجاح",
  });
});
