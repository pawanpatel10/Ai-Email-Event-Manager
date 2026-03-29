import express from "express";
import { signupUser, verifyOtp, loginUser, refreshAccessToken, logoutUser, resendOtp, forgotPassword,
  resetPassword, googleLogin, getGoogleClientConfig, saveGoogleToken, saveGoogleAuthCode, getGoogleTokenStatus
 } from "../controllers/authController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/signup", signupUser);
router.post("/verify-otp", verifyOtp);
router.post("/login", loginUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/logout", logoutUser);
router.get("/me", protect, (req, res) => {
  res.json({
    success: true,
    user: req.user,
  });
});
router.post("/resend-otp", resendOtp);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/google", googleLogin);
router.get("/google-config", getGoogleClientConfig);
router.post("/google-token", protect, saveGoogleToken);
router.post("/google-code", protect, saveGoogleAuthCode);
router.get("/google-token-status", protect, getGoogleTokenStatus);

export default router;