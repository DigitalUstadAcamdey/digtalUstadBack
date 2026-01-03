const express = require("express");
const {
  getMySubscription,
  cancelSubscription,
  createSubscription,
  renewSubscription,
} = require("../controllers/subscriptionController");
const { prmission, restrictTo } = require("../controllers/authController");


const router = express.Router();


router.post(
  "/",
  prmission,
  restrictTo("student"),
  createSubscription
);

router.post(
  '/renew/:subscriptionId',
  prmission,
  restrictTo('student'),
  renewSubscription
);

router.get(
  "/me",
  prmission,
  restrictTo("student"),
  getMySubscription
);

router.delete(
  "/cancel",
  prmission,
  restrictTo("student"),
  cancelSubscription
);

module.exports = router;
