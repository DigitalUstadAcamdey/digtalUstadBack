const express = require("express");
const {
  createCourse,
  getAllcourse,
  getCourse,
  updateCourse,
  deleteCourse,
} = require("../controllers/courseController");
const { prmission, restrictTo } = require("../controllers/authController");

const router = express.Router();
router
  .route("/")
  .post(restrictTo("teacher"), prmission, createCourse)
  .get(restrictTo("admin"), getAllcourse);

router
  .route("/:courseId")
  .get(getCourse)
  .patch(prmission, restrictTo("teacher"), updateCourse)
  .delete(restrictTo("admin"), deleteCourse);

module.exports = router;
