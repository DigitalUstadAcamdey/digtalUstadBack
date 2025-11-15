const { markAsRead, getUserNotifications } = require("../controllers/notification.controller");
const express = require("express");
const { prmission , restrictTo} = require("../controllers/authController");

const router = express.Router();

router
  .route("/")
  .get(prmission, restrictTo("student", "admin", "teacher"), getUserNotifications);

router
  .route("/:id/mark-as-read")
  .patch(prmission, restrictTo("student", "admin", "teacher"), markAsRead);

module.exports = router;