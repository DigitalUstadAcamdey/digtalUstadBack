const AppError = require("./../utils/appError");
const catchAsync = require("./../utils/catchAsync");
const Course = require("./../models/courseModel");
const APIFeaturs = require("../utils/apiFeaturs");
const User = require("../models/userModel");
const Video = require("../models/videoModel");
const File = require("../models/fileModel");

//! ################# NEW ###################
const { uploadVideo, removeVideo } = require("../utils/uploadVideo");

const multer = require("multer");
const sharp = require("sharp");
const cloudinary = require("./../config/cloudinary");
const Section = require("../models/sectionsModel");
const Coupon = require("../models/couponModel");
const Subscription = require("../models/subscriptionModel");

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("video/") ||
    file.mimetype.startsWith("image/") ||
    file.mimetype === "application/pdf" || // ملفات PDF
    file.mimetype === "application/msword" || // ملفات Word (DOC)
    file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // ملفات Word الحديثة (DOCX)
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

exports.uploadCourseFile = upload.fields([{ name: "imageCover", maxCount: 1 }]);

//Uploads a image Cover

exports.optionalImageCoverForUpdateCourse = catchAsync(
  async (req, res, next) => {
    if (!req.file) {
      return next();
    }
    next();
  }
);

exports.uploadCourseImageCover = catchAsync(async (req, res, next) => {
  if (req.file) {
    // رفع كل صورة إلى Cloudinary والحصول على روابط الصور

    const file = req.file;

    // تعديل حجم الصورة باستخدام Sharp
    const resizedImageBuffer = await sharp(file.buffer)
      .resize({
        width: 705, // أقصى عرض للكارد
        height: 397, // أقصى ارتفاع للكارد
        fit: "cover", // الصورة تمتلئ بالكامل مع قص بسيط إذا لزم
        position: "center", // مركز الصورة عند القص
        withoutEnlargement: true, // لا تكبر الصورة إذا كانت أصغر
      })
      .toBuffer();

    // رفع الصورة إلى Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "courses_imgs" },
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
  }
  if (req.files) {
    // رفع كل صورة إلى Cloudinary والحصول على روابط الصور

    const file = req.files.imageCover[0];

    // تعديل حجم الصورة باستخدام Sharp
    const resizedImageBuffer = await sharp(file.buffer)
      .resize(705, 397, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // رفع الصورة إلى Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "courses_imgs" },
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
  }
  next();
});

// teacher and admin
exports.createCourse = catchAsync(async (req, res, next) => {
  req.body.instructor = req.user.id;
  // course only containe title description price category imageCover concepts
  const course = await Course.create({
    ...req.body,
  });

  //add course to teacher
  await User.findByIdAndUpdate(
    req.user.id,
    {
      $push: { publishedCourses: course._id },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(201).json({
    message: "تم نشر بنجاح",
    course,
  });
});

//! Route : /courses/{courseId}
// this is add section  to course in after time replace with createSection
exports.updateCourseSections = catchAsync(async (req, res, next) => {
  const courseId = req.params.courseId;
  const sectionTitle = req.body.sectionTitle;

  const teacher = await User.findById(req.user.id);
  console.log(courseId);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));
  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!course.instructor._id.toString() === teacher.id.toString()) {
    return next(new AppError("ليس لديك الصلاحية لتحديث الأقسام", 403));
  }

  const section = await Section.create({
    title: sectionTitle,
    videos: [],
    courseId: course._id,
  });

  course.sections.push(section.id);
  await course.save();

  res.status(200).json({
    message: "تم حفظ القسم بنجاح",
    section,
  });
});

exports.addVideoToSection = catchAsync(async (req, res, next) => {
  const teacher = await User.findById(req.user.id);
  const sectionId = req.params.sectionId;
  const section = await Section.findById(sectionId);
  const { videoId, videoFormat } = await uploadVideo(req.body.title, req.file);
  console.log(videoId, videoFormat);
  const newVideo = await Video.create({
    lessonTitle: req.body.title,
    url: videoId,
    duration: req.body.duration,
    format: videoFormat,
    uploadedBy: teacher.id,
    sectionId: sectionId,
    description: req.body.description,
  });
  section.videos.push(newVideo.id);
  await section.save();
  res.status(200).json({
    message: "تم رفع الفديو بنجاح",
    video: newVideo,
  });
});
// add update the description
exports.updateVideoTitleAndDescription = catchAsync(async (req, res, next) => {
  const teacher = await User.findById(req.user.id);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));

  const section = await Section.findById(req.params.sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));

  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError("الفيديو غير موجود في هذا القسم", 404));

  if (video.uploadedBy.toString() !== teacher.id) {
    return next(new AppError("ليس لديك الصلاحية لتحديث عنوان الفيديو", 403));
  }

  video.lessonTitle = req.body.title;
  video.description = req.body.description;
  await video.save();

  res.status(200).json({
    message: "تم تحديث عنوان الفيديو بنجاح",
    video,
  });
});
exports.deleteVideoFromSection = catchAsync(async (req, res, next) => {
  const teacher = await User.findById(req.user.id);
  if (!teacher) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const video = await Video.findById(req.params.videoId);
  if (!video) return next(new AppError("المحاضرة غير موجود", 404));

  const section = await Section.findById(req.params.sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));

  if (video.uploadedBy.toString() !== teacher.id) {
    return next(new AppError("ليس لديك الصلاحية لتحديث عنوان الفيديو", 403));
  }

  //check is the video in side section
  if (!section.videos.includes(video._id)) {
    return next(new AppError("المحاضرة غير موجودة في هذا القسم", 400));
  }
  const isRemoved = await removeVideo(video.url);
  if (!isRemoved) {
    return next(new AppError("حدث خطأ أثناء حذف الفيديو من السحابة", 500));
  }
  // حذف الفيديو من القسم
  section.videos = section.videos.filter(
    (v) => v.toString() !== video._id.toString()
  );

  await section.save();

  await video.deleteOne();
  res.status(204).json();
});

exports.uploadUpdateImageCover = upload.single("imageCover");

exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(
    req.params.courseId,
    { $set: req.body },
    {
      new: true,
      runValidators: true,
    }
  );
  res.status(200).json({
    message: "تم التحديث بنجاح",
    course,
  });
});

// for enrolled users only (logged in users)
exports.getCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId)
    .populate([
      {
        path: "instructor",
        select: "username thumbnail",
      },
      {
        path: "sections",
        select: "title videos", // please d'ont edit this  line  (am using in courseController.js)
        populate: {
          path: "videos",
          select:
            "lessonTitle duration description url isCompleted completedBy comments files",
          populate: [
            {
              path: "comments",
              select: "user text replies createdAt",
              populate: {
                path: "replies.user",
                select: "username thumbnail createdAt",
              },
            },
            {
              path: "files",
              select: "filename size url format",
            },
          ],
        },
      },

      {
        path: "reviews",
        select: "user createdAt rating content",
        options: { sort: { createdAt: -1 } }, // ترتيب التقييمات من ��ديد الى قديم
      },
    ])
    .lean();
  if (!course) return next(new AppError("المادة غير موجودة", 404));
  res.status(200).json({
    message: "نجاح",
    course,
  });
});
// for all users (logged in and not logged in users)
exports.getCourseOverview = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId)
    .populate([
      {
        path: "instructor",
        select: "username thumbnail ",
      },
      {
        path: "sections",
        select: "title videos",
        populate: {
          path: "videos",
          select:
            "lessonTitle duration",
        },
      },
      {
        path: "reviews",
        select: "user createdAt rating content",
        options: { sort: { createdAt: -1 } },
      },
    ])
    .lean();
  if (!course) return next(new AppError("المادة غير موجودة", 404));
  res.status(200).json({
    message: "نجاح",
    course,
  });
});

// for admin only
exports.getAllcourse = catchAsync(async (req, res, next) => {
  const features = new APIFeaturs(
    Course.find().populate([
      {
        path: "instructor",
        select: " -publishedCourses -password -role -active -balance -enrolledCourses -progress",
      },
      {
        path: "sections",
        select: "title videos", // please d'ont edit this  line  (am using in courseController.js)
        populate: {
          path: "videos",
          select:
            "lessonTitle duration  isCompleted completedBy comments files",
          populate: [
            {
              path: "comments",
              select: "user text replies createdAt",
              populate: {
                path: "replies.user",
                select: "username thumbnail createdAt",
              },
            },
            {
              path: "files",
              select: "filename size url format",
            },
          ],
        },
      },
      {
        path: "reviews",
        select: "user createdAt rating content",
        options: { sort: { createdAt: -1 } }, // ترتيب التقييمات من ��ديد الى قديم
      },
    ]),
    req.query
  )
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
exports.getMyCourses = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate({
    path: "enrolledCourses",
    populate: {
      path: "sections",
      select: "title videos",
    },
  });
  res.status(200).json({
    message: "تم الحصول على دورراتك بنجاح",
    course: user.enrolledCourses,
  });
});

// enrolled student in course (without subscription)
exports.enrollCourse =catchAsync(async (req, res, next) => {
  const courseId = req.params.courseId;
  const studentId = req.user.id;
  const { couponCode } = req.body;

  const student = await User.findById(studentId);
  if (!student) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (student.enrolledCourses.includes(courseId)) {
    return next(new AppError("أنت مسجل بالفعل في هذا الكورس", 400));
  }

  let finalPrice = course.price;
  if (couponCode) {
    const coupon = await Coupon.findOne({
      code: couponCode,
    });
    if (!coupon) return next(new AppError("الكوبون غير صحيح", 400));
    if (!coupon.isValid())
      return next(new AppError("الكوبون غير صالح أو منتهي", 400));

    if (coupon.courseId && coupon.courseId.toString() !== courseId.toString()) {
      return next(new AppError("هذا الكوبون غير مخصص لهذه الدورة", 400));
    }

    finalPrice =
      course.price - (course.price * coupon.discountAsPercentage) / 100;
    coupon.usedCount += 1;
    await coupon.save();
  }

  // simple balance check finalPrice > 0 && student.balance < finalPrice 
  if (!(student.balance >= 0 && student.balance >= finalPrice)) {
    return next(new AppError("ليس لديك رصيد كاف للتسجيل في هذا الكورس", 400));
  }

  course.enrolledStudents.push(studentId);
  course.studentsCount += 1;

  await course.save();

  // update user info after enroll in course
   await User.findByIdAndUpdate(
    studentId,
    {
      $push: { enrolledCourses: courseId },
      $inc: { balance: -finalPrice },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    message: "تم التسجيل في الدورة بنجاح",
  });
});
// enrolled student in course (with subscription)
exports.enrollCourseWithSubscription = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const userId = req.user.id;

  const user = await User.findById(userId);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("الكورس غير موجود", 404));

  // check for active subscription
  const subscription = await Subscription.findOne({
    user: userId,
    status: "active",
    endDate: { $gt: new Date() },
  });

  if (!subscription) {
    return next(new AppError("لا تملك اشتراكًا نشطًا", 403));
  }

  // check if already enrolled
  if (user.enrolledCourses.includes(courseId)) {
    return next(new AppError("أنت مسجل بالفعل في هذا الكورس", 400));
  }

  // add course to user's enrolledCourses
  user.enrolledCourses.push(courseId);
  await user.save({
        validateBeforeSave: false,
      });

  // add course to subscription.courses
  subscription.courses.push(courseId);
  await subscription.save();

  // update course stats
  course.enrolledStudents.push(userId);
  course.studentsCount += 1;
  await course.save();

  res.status(200).json({
    message: "تم التسجيل في الكورس عبر الاشتراك السنوي",
  });
});



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

// search course for admin and student
exports.searchCourses = catchAsync(async (req, res, next) => {
  const query = req.query.query;
  // استلام نص البحث من المتغير query
  if (!query) {
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

//search cours for teachers
exports.searchCoursesTeachers = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id).populate("publishedCourses");
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  const query = req.query.query;
  // استلام نص البحث من المتغير query
  if (!query) {
    return next(new AppError("يرجى إدخال نص للبحث", 400));
  }

  if (!user.publishedCourses || user.publishedCourses.length === 0) {
    return next(new AppError("لا توجد كورسات منشورة", 404));
  }

  const courses = user.publishedCourses.filter((course) => {
    return course.title.toLowerCase().includes(query.toLowerCase());
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

//Files (pdf or docx ,doc)

exports.uploadFile = upload.single("file");

exports.uploadFileToCloudinary = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("يرجى تحميل الملف أولا", 400));
  }
  const file = req.file;
  const result = await new Promise((resolve, reject) => {
    const fileName = `${Date.now()}-${file.originalname}`;

    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: "raw",
        folder: "course-files",
        public_id: fileName,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      }
    );

    stream.end(file.buffer);
  });

  req.body.url = result.secure_url;
  req.body.size = result.bytes;

  next();
});

exports.addFile = catchAsync(async (req, res, next) => {
  const { courseId, sectionId, videoId } = req.params;

  req.body.uploadedBy = req.user.id;

  const file = await File.create(req.body);

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }
  const section = await Section.findById(sectionId);
  if (!section) {
    return next(new AppError("القسم غير موجودة", 404));
  }
  const video = await Video.findById(videoId);
  if (!video) {
    return next(new AppError("الدرس غير موجودة", 404));
  }

  video.files.push(file._id);

  await video.save();

  res.status(200).json({
    message: "تمت إضافة الملف بنجاح",
    file,
  });
});

exports.deleteFile = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError("المستخدم غير موجود", 404));
  }

  const { courseId, sectionId, videoId, fileId } = req.params;

  // البحث عن الملف بواسطة الـ id
  const file = await File.findById(fileId);

  // إذا لم يتم العثور على الملف
  if (!file) {
    return next(new AppError("الملف غير موجود", 404));
  }

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError("المادة غير موجودة", 404));
  }
  const section = await Section.findById(sectionId);
  if (!section) {
    return next(new AppError("القسم غير موجودة", 404));
  }
  const video = await Video.findById(videoId);
  if (!video) {
    return next(new AppError("الدرس غير موجودة", 404));
  }

  if (!video.files.some((f) => f._id.equals(file.id))) {
    return next(new AppError("الملف غير مرتبط بالدورة", 400));
  }

  // حذف الملف
  await file.deleteOne();

  video.files = video.files.filter(
    (f) => f._id.toString() !== file._id.toString()
  );

  await video.save();

  // استجابة النجاح
  res.status(200).json({
    message: "تم حذف الملف بنجاح",
  });
}); // file is not deleted from cloudinary

// mark is completed  and update progress
exports.isCompleted = catchAsync(async (req, res, next) => {
  const { videoId } = req.params;

  // التحقق من المستخدم
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  // التحقق من الفيديو
  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));
  // التحقق من القسم
  const section = await Section.findById(video.sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));
  // التحقق إذا كان المستخدم قد أكمل الفيديو بالفعل
  if (video.completedBy.includes(user.id)) {
    return next(new AppError("لقد شاهدت الفيديو بالفعل", 400));
  }

  // تحديث الفيديو بإضافة المستخدم إلى قائمة completedBy
  video.completedBy.push(user.id);
  await video.save();

  // تحديث تقدم المستخدم في الدورة
  if (!section._id) {
    return next(new AppError("الفيديو لا يحتوي على معرف الدورة", 400));
  }
  console.log(section);
  await user.updateProgress(section.courseId, video._id);

  // إرسال استجابة النجاح
  res.status(200).json({
    status: "success",
    message: "تم مشاهدة الفيديو بنجاح",
    lesson: video,
  });
});

exports.getCoursesAndCategory = catchAsync(async (req, res, next) => {
  const courses = await Course.find();
  //save categories
  const categorys = [];
  courses.filter((course) => {
    if (!categorys.includes(course.category)) {
      categorys.push(course.category);
    }
  });
  const categorysAndCourses = [];
  // save category and courses in object
  categorys.map((category) => {
    categorysAndCourses.push({
      category,
      courses: courses.filter((course) => course.category === category),
    });
  });

  res.status(200).json({
    status: "success",
    message: "تم الحصول على المادات والأقسام",
    courses: categorysAndCourses,
  });
});

// إدارة الأقسام

exports.updateSection = catchAsync(async (req, res, next) => {
  const { sectionId, courseId } = req.params;
  const teacher = await User.findById(req.user.id);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!course.instructor._id.toString() === teacher.id.toString()) {
    return next(new AppError("ليس لديك الصلاحية لتحديث هذا القسم", 403));
  }

  const section = await Section.findById(sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));
  if (
    !course.sections.some((section) => section._id.toString() === sectionId)
  ) {
    return next(new AppError("القسم غير مرتبط بهذه الدورة", 400));
  }

  const updatedSection = await Section.findByIdAndUpdate(sectionId, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    message: "تم تحديث القسم بنجاح",
    section: updatedSection,
  });
});

exports.deleteSection = catchAsync(async (req, res, next) => {
  const { sectionId, courseId } = req.params;
  const teacher = await User.findById(req.user.id);
  if (!teacher) return next(new AppError("المستخدم غير موجود", 404));

  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("المادة غير موجودة", 404));

  if (!course.instructor._id.toString() === teacher.id.toString()) {
    return next(new AppError("ليس لديك الصلاحية لحذف هذا القسم", 403));
  }

  const section = await Section.findById(sectionId);
  if (!section) return next(new AppError("القسم غير موجود", 404));

  if (
    !course.sections.some((section) => section._id.toString() === sectionId)
  ) {
    return next(new AppError("القسم غير مرتبط بهذه الدورة", 400));
  }

  // حذف جميع الفيديوهات في القسم
  if (section.videos.length > 0) {
    await Video.deleteMany({ _id: { $in: section.videos } });
  }

  // حذف القسم
  await section.deleteOne();

  // إزالة القسم من الدورة
  course.sections = course.sections.filter(
    (s) => s._id.toString() !== section._id.toString()
  );
  await course.save();

  res.status(204).json();
});

// for  daynmic route
exports.getOnlyTitleAndDescription = catchAsync(async (req, res, next) => {
  const { courseId } = req.params;
  const courseWithTitleAndDescription = await Course.findById(courseId)
    .select("title description")
    .exec();
  if (!courseWithTitleAndDescription) {
    return next(new AppError(`لا توجد كورس تطابق هذا المعرف${courseId}`, 404));
  }
  res.status(200).json({
    message: "تم  جلب الكوررس مع العنوان  والوصف",
    course: courseWithTitleAndDescription,
  });
});
exports.getOnlyCoursesIds = catchAsync(async (req, res, next) => {
  const coursesIds = await Course.find().select("_id").exec();
  res.status(200).json({
    message: "تم جلب جميع ال Ids",
    courses: coursesIds,
  });
});
