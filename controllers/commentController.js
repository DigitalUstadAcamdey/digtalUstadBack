const Comment = require("../models/commentModel");
const Course = require("../models/courseModel");
const User = require("../models/userModel");
const Video = require("../models/videoModel");
const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

exports.getAllComments = catchAsync(async (req, res, next) => {
  const comments = await Comment.find().populate([
    {
      path: "user",
      select: "username thumbnail",
    },
    {
      path: "replies.user",
      select: "username thumbnail",
    },
  ]);
  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    counts: comments.length,
    data: { comments },
  });
});

exports.addComment = catchAsync(async (req, res, next) => {
  const { courseId, videoId } = req.params;
  req.body.user = req.user.id;
  req.body.course = courseId;
  req.body.video = videoId;

  // التحقق من وجود المستخدم
  const user = await User.findById(req.user.id);
  if (!user) return next(new AppError("المستخدم غير موجود", 404));

  // التحقق من وجود الكورس أو الفيديو (اختياري)
  const course = await Course.findById(courseId);
  if (!course) return next(new AppError("الكورس غير موجود", 404));

  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  // إنشاء التعليق
  const comment = await Comment.create(req.body);

  video.comments.push(comment._id);
  await video.save();

  res.status(201).json({
    status: "success",
    message: "تم إضافة التعليق بنجاح",
    data: { comment },
  });
});

exports.updateComment = catchAsync(async (req, res, next) => {
  const { commentId, videoId } = req.params;
  const { text } = req.body;

  // البحث عن التعليق
  const comment = await Comment.findById(commentId);

  if (!comment) return next(new AppError("التعليق غير موجود", 404));

  // التحقق من صلاحية المستخدم
  if (comment.user.toString() !== req.user._id.toString())
    return next(new AppError("ليس لديك الصلاحية لتعديل هذا التعليق", 403));

  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  if (!video.comments.some((c) => c.toString() === comment._id.toString())) {
    return next(new AppError("التعليق غير مرتبط بالفيديو", 400));
  }

  // تعديل النص
  comment.text = text;
  await comment.save();

  res.status(200).json({
    status: "success",
    message: "تم تعديل التعليق بنجاح",
    data: { comment },
  });
});

exports.deleteComment = catchAsync(async (req, res, next) => {
  const { commentId, videoId } = req.params;

  // البحث عن التعليق
  const comment = await Comment.findById(commentId);

  if (!comment) return next(new AppError("التعليق غير موجود", 404));

  // التحقق من صلاحية المستخدم
  if (comment.user.toString() !== req.user._id.toString())
    return next(new AppError("ليس لديك الصلاحية لحذف هذا التعليق", 403));

  const video = await Video.findById(videoId);
  if (!video) return next(new AppError("الفيديو غير موجود", 404));

  if (!video.comments.some((c) => c.toString() === comment._id.toString())) {
    return next(new AppError("التعليق غير مرتبط بالفيديو", 400));
  }
  // حذف التعليق
  await comment.deleteOne();

  video.comments = video.comments.filter(
    (commentIdInVideo) => commentIdInVideo.toString() !== commentId
  );
  await video.save();

  res.status(204).json({
    status: "success",
    message: "تم حذف التعليق بنجاح",
  });
});

// for teacher
exports.addReply = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const { text } = req.body;

  // البحث عن التعليق
  const comment = await Comment.findById(commentId);

  if (!comment) return next(new AppError("التعليق غير موجود", 404));

  comment.replies.push({ user: req.user._id, text });
  await comment.save();

  res.status(201).json({
    status: "success",
    message: "تم إضافة الرد بنجاح",
    data: { comment },
  });
});

exports.getCommentsInLesson = catchAsync(async (req, res, next) => {
  const { videoId } = req.params;
  const comments = await Comment.find({
    video: videoId,
  }).populate([
    {
      path: "user",
      select: "username thumbnail",
    },
    {
      path: "replies.user",
      select: "username thumbnail",
    },
  ]);
  res.status(200).json({
    status: "success",
    message: "تم التحديث بنجاح",
    counts: comments.length,
    data: { comments },
  });
});
