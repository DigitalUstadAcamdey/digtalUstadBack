const express = require("express");
const {
  loginUser,
  signUpUser,
  prmission,
  loginWithGithub,
  loginWithGoogle,
} = require("../controllers/authController");
const passport = require("passport");
const User = require("../models/userModel");

const router = express.Router();

router.post("/login", loginUser);
router.post("/signup", signUpUser);

// توجيه المستخدم إلى GitHub للمصادقة
router.get(
  "/github",
  passport.authenticate("github", {
    scope: ["user:email"],
  })
);


router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/register" }),
  loginWithGithub
);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  loginWithGoogle
);

module.exports = router;
