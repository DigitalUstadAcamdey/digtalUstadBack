const express = require("express");
const {
  createCourse,
  getAllcourse,
  getCourse,
  updateCourse,
  deleteCourse,
  enrollCourse,
  uploadCourseImageCover,
  uploadVideosCourse,
  uploadCourseFile,
  deleteLesson,
  unenrollCourse,
  searchCourses,
  updateProgress,
  uploadFilesCourse,
  addLesson,
  updateLesson,
  uploadVideoFromLesson,
  uploadVideoLesson,
  searchCoursesTeachers,
  requireVideoForCreateLesson,
  optionalVideoForUpdateLesson,
  deleteFile,
  addFile,
  uploadFile,
  uploadFileToCloudinary,
  uploadUpdateImageCover,
  requireImageCoverForCreateCourse,
  optionalImageCoverForUpdateCourse,
} = require("../controllers/courseController");
const { prmission, restrictTo } = require("../controllers/authController");
const {
  addReview,
  updateReview,
  deleteReview,
  setUserId,
} = require("../controllers/reviewController");

const router = express.Router();

router
  .route("/")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadCourseFile,
    requireImageCoverForCreateCourse,
    uploadCourseImageCover,
    uploadVideosCourse,
    uploadFilesCourse,
    createCourse
  )
  .get(getAllcourse);

router.route("/searchCourses").get(searchCourses);
router
  .route("/searchCoursesByTeacher")
  .get(prmission, restrictTo("teacher"), searchCoursesTeachers);

router
  .route("/:courseId")
  .get(getCourse)
  .patch(
    prmission,
    restrictTo("teacher"),
    uploadUpdateImageCover,
    optionalImageCoverForUpdateCourse,
    uploadCourseImageCover,
    updateCourse
  )
  .delete(prmission, restrictTo("admin", "teacher"), deleteCourse)
  .post(
    prmission,
    restrictTo("teacher"),
    uploadVideoFromLesson,
    requireVideoForCreateLesson,
    uploadVideoLesson,
    addLesson
  );

//enrolled in course
router
  .route("/enrolled/:courseId")
  .post(prmission, restrictTo("student"), enrollCourse)
  .post(prmission, restrictTo("student"), unenrollCourse);
//add review

// remove video from course
router
  .route("/:courseId/videos/:videoId")
  .delete(prmission, restrictTo("teacher"), deleteLesson)
  .patch(
    prmission,
    restrictTo("teacher"),
    uploadVideoFromLesson,
    optionalVideoForUpdateLesson,
    uploadVideoLesson,
    updateLesson
  )
  .post(prmission, restrictTo("student"), updateProgress);

// Section Reviews
router
  .route("/reviews/:courseId")
  .post(prmission, restrictTo("student"), addReview);

router
  .route("/:courseId/reviews/:reviewId")
  .patch(prmission, restrictTo("student"), updateReview)
  .delete(prmission, restrictTo("admin", "student"), deleteReview);

//section Files
router
  .route("/:courseId/files")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadFile,
    uploadFileToCloudinary,
    addFile
  );

router
  .route("/:courseId/files/:fileId")
  .delete(prmission, restrictTo("teacher"), deleteFile);

module.exports = router;
