const express = require("express");
const { prmission, restrictTo } = require("../controllers/authController");
const {
  getAllFaqMsg,
  updateFaq,
  deleteFaq,
  getFaq,
  sendFaq,
} = require("../controllers/ticketController");

const router = express.Router();

router
  .route("/")
  .get(prmission, restrictTo("admin"), getAllFaqMsg)
  .post(prmission, restrictTo("student"), sendFaq);

router
  .route("/:ticketId")
  .get(prmission, restrictTo("student", "teacher"), getFaq)
  .patch(prmission, restrictTo("student", "teacher"), updateFaq)
  .delete(prmission, restrictTo("admin", "student"), deleteFaq);

module.exports = router;
