const express = require("express");
const { getAllUsers } = require("../controllers/userController");
const { prmission } = require("../controllers/authController");

const router = express.Router();

router.route("/").get(prmission,getAllUsers);

module.exports = router;
