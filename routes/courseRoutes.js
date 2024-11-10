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
  deleteVideo,
  unenrollCourse,
  searchCourses,
} = require("../controllers/courseController");
const { prmission, restrictTo } = require("../controllers/authController");

const router = express.Router();

router
  .route("/")
  .post(
    prmission,
    restrictTo("teacher"),
    uploadCourseFile,
    uploadCourseImageCover,
    uploadVideosCourse,
    createCourse
  )
  .get(prmission, restrictTo("admin"), getAllcourse);

router.route("/searchCourses").get(searchCourses);

router
  .route("/:courseId")
  .get(getCourse)
  .patch(prmission, restrictTo("teacher"), updateCourse)
  .delete(prmission, restrictTo("admin", "teacher"), deleteCourse);

//enrolled in course
router
  .route("/enrolled/:courseId")
  .post(prmission, restrictTo("student"), enrollCourse)
  .post(prmission, restrictTo("student"), unenrollCourse);

// remove video from course

router
  .route("/:courseId/videos/:videoId")
  .delete(prmission, restrictTo("teacher"), deleteVideo);

module.exports = router;
