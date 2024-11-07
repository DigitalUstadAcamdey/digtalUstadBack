const express = require("express");
const {
  loginUser,
  signUpUser,
  prmission,
  redirectGoogle,
  loginWithGoogle,
} = require("../controllers/authController");
const passport = require("passport");
const User = require("../models/userModel");

const router = express.Router();

router.post("/login", loginUser);
router.post("/signup", signUpUser);

router.get("/google", redirectGoogle);

router.get("/google/callback", loginWithGoogle);



module.exports = router;
