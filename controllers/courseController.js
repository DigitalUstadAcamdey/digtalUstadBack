const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const Course = require("./../models/courseModel");
const APIFeaturs = require("../utils/apiFeaturs");

// teacher and admin
exports.createCourse = catchAsync(async (req, res, next) => {
  const course = await Course.create({
    title: req.body.title,
    description: req.body.description,
    duration: req.body.duration,
    price: req.body.price,
    instructor: req.user.id,
    videos: req.body.videos,
    studentsCount: req.body.studentsCount,
    category: req.body.category,
  });
  res.status(201).json({
    message: "تم نشر بنجاح",
    course,
  });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(req.params.courseId, req.body, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    message: "تم التحديث بنجاح",
    course,
  });
});

exports.getCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));
  res.status(200).json({
    message: "نجاح",
    course,
  });
});

// for admin only
exports.getAllcourse = catchAsync(async (req, res, next) => {
  
  const features = new APIFeaturs(Course.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  // const doc = await features.query.explain();
  const courses = await features.query;
  res.status(200).json({
    message: "succse",
    results: courses.length,
    courses,
  });
});

exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.courseId);
  if (!course) return next(new AppError("المادة عير موجودة", 404));
  res.status(204).json({
    message: "تم الحذف بنجاح",
  });
});

// تسجيل طالب في الكورس
exports.enrollCourse = async (req, res, next) => {
  /* ... */
};

// الحصول على الكورسات بحسب الفئة
exports.getCoursesByCategory = async (req, res, next) => {
  /* ... */
};

// الحصول على الكورسات الأكثر شعبية
exports.getPopularCourses = async (req, res, next) => {
  /* ... */
};

// إضافة فيديو جديد إلى الكورس
exports.addVideoToCourse = async (req, res, next) => {
  /* ... */
};

// نشر الكورس
exports.publishCourse = async (req, res, next) => {
  /* ... */
};
