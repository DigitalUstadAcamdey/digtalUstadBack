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
  resendVerificationEmail,
  getMySessions,
  logoutSession,
  logoutAllSessions,
} = require("../controllers/authController");


const router = express.Router();

router.post("/login", loginUser);
// ronly basic info(email , username , password) not include the image , can added the image in the update profile route
router.post("/signup", signup);
router.post('/logout',logout)
router.get("/sessions", prmission, getMySessions);
router.delete("/sessions/:sessionId", prmission, logoutSession);
router.post("/logout-all", prmission, logoutAllSessions);

router.get("/google", redirectGoogle);

router.get("/google/callback", loginWithGoogle);

router.post("/forget-password", forgetPassword);
router.post("/reset-password/:resetToken", resetPassword);

// Email verification route
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verify-email", resendVerificationEmail);


module.exports = router;
