const express = require("express");
const {
  getAnalytics,
  getSubscriptionPrice,
  updateSubscriptionPrice,
} = require("../controllers/adminController");
const { prmission, restrictTo } = require("../controllers/authController");

const router = express.Router();

router.route("/").get(prmission, restrictTo("admin"), getAnalytics);
router
  .route("/subscription-price")
  .get(prmission, restrictTo("admin", "student"), getSubscriptionPrice)
  .put(prmission, restrictTo("admin"), updateSubscriptionPrice);

module.exports = router;
