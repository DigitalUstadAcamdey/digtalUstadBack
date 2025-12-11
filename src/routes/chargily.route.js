const express = require("express");
const { createPayment } = require("../controllers/chargily.controller");
const { prmission, restrictTo } = require("../controllers/authController");

const router = express.Router();

router.post(`/topup`,prmission,restrictTo('student'),createPayment)
// router.post('/webhook',addWebhook)

module.exports = router