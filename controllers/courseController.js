const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const Course = require("./../models/courseModel");
const APIFeaturs = require("../utils/apiFeaturs");
const User = require("../models/userModel");

const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("./../config/cloudinary");
const Video = require("../models/videoModel");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("image/")
  ) {
    cb(null, true);
  } else {
    cb(
      new AppError("يجب أن يكون الملف من نوع فيديو أو ملف أو صورة ", 400),
      false
    );
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadCourseFile = upload.fields([
  { name: "imageCover", maxCount: 1 },
  { name: "videos", maxCount: 4 },
]);
//! don't forget to add upload files (pdf files)

//Uploads a image Cover
exports.uploadCourseImageCover = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.imageCover) {
    return next(new AppError("يرجى تحميل ملف أولاً", 400));
  }
  // رفع كل صورة إلى Cloudinary والحصول على روابط الصور

  const file = req.files.imageCover[0];

  // تعديل حجم الصورة باستخدام Sharp
  const resizedImageBuffer = await sharp(file.buffer)
    .resize(700, 700)
    .toBuffer();

  // رفع الصورة إلى Cloudinary
  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "image" },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(resizedImageBuffer);
  });
  req.body.imageCover = result.secure_url;
  next();
});
//Uploads a videos
exports.uploadVideosCourse = catchAsync(async (req, res, next) => {
  if (!req.files || !req.files.videos) {
    return next(new AppError("لم يتم إرسال أي فيديوهات", 400));
  }

  const videoPromises = req.files.videos.map((videoFile, i) => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "course-videos", resource_type: "video" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(videoFile.buffer);
    }).then((result) => {
      return Video.create({
        url: result.secure_url,
        title: `${req.body.title}-${i + 1}`,
        description: req.body.description,
        uploadedBy: req.user.id,
        format: "mp4",
      });
    });
  });

  const videos = await Promise.all(videoPromises);
  req.body.videos = videos.map((video) => video._id);
  next();
});

// teacher and admin
exports.createCourse = catchAsync(async (req, res, next) => {
  req.body.instructor = req.user.id;
  const course = await Course.create(req.body);

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
//
exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndDelete(req.params.courseId);
  if (!course) return next(new AppError("المادة عير موجودة", 404));
  res.status(204).json({
    message: "تم الحذف بنجاح",
  });
});

// تسجيل طالب في الكورس
exports.enrollCourse = async (req, res, next) => {
  // don't forget permission midallwear

  //add course to student

  const courseId = req.params.courseId;
  const studentId = req.user.id;

  const student = await User.findById(studentId);
  if (!student) return next(new AppError("المستخدم غير موجود", 404));

  if (student.enrolledCourses.includes(courseId)) {
    return next(new AppError("أنت مسجل بالفعل في هذا الكورس", 400));
  }

  const updatedStudent = await User.findByIdAndUpdate(studentId, {
    $push: { enrolledCourses: courseId },
  });

  //add student to course
  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  course.enrolledStudents.push(studentId);
  course.studentsCount += 1;

  await course.save();

  res.status(200).json({
    message: "تم التسجيل في الدورة بنجاح",
  });
};

// remove student from course
exports.unenrollCourse = catchAsync(async (req, res, next) => {
  const courseId = req.params.courseId;
  const studentId = req.user.id;
  const student = await User.findById(studentId);
  if (!student) return next(new AppError("المستخدم غير موجود", 404));
  if (!student.enrolledCourses.includes(courseId)) {
    return next(new AppError("أنت لست مسجل في هذا الكورس", 400));
  }
  const updatedStudent = await User.findByIdAndUpdate(studentId, {
    $pull: { enrolledCourses: courseId },
  });
  const course = await Course.findByIdAndUpdate(courseId, {
    $pull: { enrolledStudents: studentId },
    $inc: { studentsCount: -1 },
  });
});

// search course

exports.searchCourses = catchAsync(async (req, res, next) => {
  const  query  = req.query.query;
 // استلام نص البحث من المتغير query
  if (!query ) {
    return next(new AppError("يرجى إدخال نص للبحث", 400));
  }
  const courses = await Course.find({
    $or: [
      { title: { $regex: query, $options: "i" } }, // البحث حسب العنوان
      { description: { $regex: query, $options: "i" } }, // البحث حسب الوصف
    ],
  });

  if (courses.length === 0) {
    return next(new AppError("لا توجد كورسات تطابق هذا البحث", 404));
  }

  res.status(200).json({
    message: "تم العثور على الكورسات بنجاح",
    results: courses.length,
    courses,
  });
});
// review and rating

//حذف فيديو
exports.deleteVideo = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }
  const course = await Course.findById(req.params.courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!user.publishedCourses.includes(course.id)) {
    return next(new AppError("ليس لديك الصلاحية لحذف هذا الفيديو", 403));
  }

  const video = await Video.findByIdAndDelete(req.params.videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  if (!course.videos.includes(video._id)) {
    return next(new AppError("الفيديو غير موجود في هذه الدورة", 400));
  }
  course.videos = course.videos.filter(
    (id) => id.toString() !== video._id.toString()
  );
  await course.save();
  res.status(204).json({
    message: "تم الحذف بنجاح الفيديو بنجاح",
  });
});
