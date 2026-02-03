const express = require("express");
const {
  loginUser,
  signup,
  prmission,
  redirectGoogle,
  loginWithGoogle,
  forgetPassword,
  resetPassword,
  uploadImageUser,
  uploadUsingClodinary,
  logout,
  verifyEmail,
} = require("../controllers/authController");


const router = express.Router();

router.post("/login", loginUser);
router.post("/signup", uploadImageUser, uploadUsingClodinary, signup);
router.post('/logout',logout)

router.get("/google", redirectGoogle);

router.get("/google/callback", loginWithGoogle);

router.post("/forget-password", forgetPassword);
router.post("/reset-password/:resetToken", resetPassword);

// Email verification route
router.get("/verify-email/:token", verifyEmail);

module.exports = router;
