const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const User = require("../models/userModel");
const {
  findActiveAnnualSubscription,
  hasObjectId,
} = require("../utils/subscriptionAccess");


// this only work when the user is show All the source of a course
exports.checkCourseAccess = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  // check if user purchased or enrolled in course
  const isEnrolled = hasObjectId(user.enrolledCourses, courseId);

  if (isEnrolled) {
    return next();
  }
  // for teachers
  if (user.role === "teacher") {
    const isPublished = hasObjectId(user.publishedCourses, courseId);
    if (isPublished) {
      return next();
    }
  }
  // for admins
  if (user.role === "admin") {
    return next();
  }

  const activeAnnualSubscription = await findActiveAnnualSubscription(userId)
    .select("_id")
    .lean();

  if (activeAnnualSubscription) {
    return next();
  }

  return next(new AppError("لا تملك صلاحية الوصول", 403));
});
