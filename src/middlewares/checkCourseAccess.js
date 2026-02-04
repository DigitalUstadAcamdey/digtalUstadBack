const catchAsync =require('../utils/catchAsync')
const AppError =require('../utils/appError')
const Subscription = require("../models/subscriptionModel");
const User = require('../models/userModel');


// this only work when the user is show All the source of a course
exports.checkCourseAccess = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  const user = await User.findById(userId)

  // check if user purchased or enrolled in course
  const isEnrolled = user.enrolledCourses.includes(courseId);

  // if he has subscription or is enrolled, allow access
  if (isEnrolled) {
    return next();
  }
  // for teachers 
  if(user.role === 'teacher'){
    const isPublished = user.publishedCourses.find(course => course._id.toString() === courseId);
    if(isPublished){
      return next();
    }
  }
  // for admins
  if (user.role === "admin") {
    return next();
  }

  return next(new AppError("لا تملك صلاحية الوصول", 403));
});

