import asyncHandler from "../middlewares/asyncHandler.js";
import User from "../models/User.js";
import generateOTP from "../utils/otpGenerator.js";
import sendEmail from "../utils/sendEmail.js";
import { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const createGoogleCodeClient = () =>
  new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "postmessage"
  );

const REQUIRED_GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

const getDefaultSchedulerLastResult = () => ({
  processedMessages: 0,
  createdEvents: 0,
  scheduledEvents: 0,
  skippedAlreadyProcessed: 0,
  skippedNonEvent: 0,
});

const buildSchedulerStatus = (currentStatus) => ({
  ...(currentStatus || {}),
  lastResult: {
    ...getDefaultSchedulerLastResult(),
    ...((currentStatus && currentStatus.lastResult) || {}),
  },
  lastError: "",
});

const normalizeScopes = (tokenInfo) => {
  if (Array.isArray(tokenInfo?.scopes)) {
    return tokenInfo.scopes;
  }

  if (typeof tokenInfo?.scope === "string") {
    return tokenInfo.scope.split(/\s+/).filter(Boolean);
  }

  return [];
};

const decodeJwtPayload = (token) => {
  const parts = token.split(".");
  if (parts.length < 2) {
    throw new Error("Invalid token format");
  }

  const payloadRaw = Buffer.from(parts[1], "base64url").toString("utf8");
  return JSON.parse(payloadRaw);
};

const verifyGoogleTokenWithFallback = async (tokenId) => {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: tokenId,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    return ticket.getPayload();
  } catch (error) {
    const canUseInsecureFallback =
      process.env.NODE_ENV !== "production" &&
      process.env.ALLOW_INSECURE_GOOGLE_LOGIN === "true";

    if (!canUseInsecureFallback) {
      throw error;
    }

    // Dev-only fallback when cert retrieval fails in restricted networks.
    const payload = decodeJwtPayload(tokenId);
    const now = Math.floor(Date.now() / 1000);

    if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
      throw new Error("Invalid Google token audience");
    }

    if (!payload.exp || payload.exp <= now) {
      throw new Error("Google token expired");
    }

    if (!payload.email_verified) {
      throw new Error("Google email is not verified");
    }

    return payload;
  }
};

export const getGoogleClientConfig = asyncHandler(async (_req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID.includes("your_google_client_id")) {
    res.status(500);
    throw new Error("Google OAuth is not configured on server");
  }

  res.json({
    success: true,
    clientId: process.env.GOOGLE_CLIENT_ID,
  });
});

export const saveGoogleToken = asyncHandler(async (req, res) => {
  const { accessToken } = req.body;

  if (!accessToken) {
    res.status(400);
    throw new Error("Google access token is required");
  }

  const tokenInfo = await googleClient.getTokenInfo(accessToken);

  const grantedScopes = normalizeScopes(tokenInfo);
  const missingScopes = REQUIRED_GOOGLE_SCOPES.filter(
    (scope) => !grantedScopes.includes(scope)
  );

  if (!tokenInfo?.email) {
    res.status(400);
    throw new Error("Invalid Google access token");
  }

  if (missingScopes.length > 0) {
    res.status(400);
    throw new Error(
      `Insufficient Google permissions. Please reconnect and allow Gmail + Calendar access. Missing: ${missingScopes.join(", ")}`
    );
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.googleAccessToken = accessToken;
  if (!user.googleId && tokenInfo.sub) {
    user.googleId = tokenInfo.sub;
  }

  user.schedulerStatus = buildSchedulerStatus(user.schedulerStatus);

  await user.save();

  res.json({
    success: true,
    message: "Google services connected successfully",
  });
});

export const saveGoogleAuthCode = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400);
    throw new Error("Google auth code is required");
  }

  const codeClient = createGoogleCodeClient();
  const { tokens } = await codeClient.getToken(code);

  if (!tokens?.access_token) {
    res.status(400);
    throw new Error("Google did not return an access token");
  }

  const grantedScopes = normalizeScopes(tokens);
  const missingScopes = REQUIRED_GOOGLE_SCOPES.filter(
    (scope) => !grantedScopes.includes(scope)
  );

  if (missingScopes.length > 0) {
    res.status(400);
    throw new Error(
      `Insufficient Google permissions. Please reconnect and allow Gmail + Calendar access. Missing: ${missingScopes.join(
        ", "
      )}`
    );
  }

  const tokenInfo = await googleClient.getTokenInfo(tokens.access_token);
  if (!tokenInfo?.email) {
    res.status(400);
    throw new Error("Invalid Google token response");
  }

  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.googleAccessToken = tokens.access_token;
  if (tokens.refresh_token) {
    user.googleRefreshToken = tokens.refresh_token;
  }
  if (!user.googleId && tokenInfo.sub) {
    user.googleId = tokenInfo.sub;
  }

  user.schedulerStatus = buildSchedulerStatus(user.schedulerStatus);

  await user.save();

  res.json({
    success: true,
    message: tokens.refresh_token
      ? "Google services connected with long-lived access"
      : "Google services connected. Re-consent may be needed once to enable long-lived access.",
    hasRefreshToken: Boolean(tokens.refresh_token || user.googleRefreshToken),
  });
});

export const getGoogleTokenStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "googleAccessToken googleRefreshToken"
  );

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!user.googleAccessToken && !user.googleRefreshToken) {
    return res.json({
      success: true,
      connected: false,
      isValid: false,
      isExpired: false,
    });
  }

  if (!user.googleAccessToken && user.googleRefreshToken) {
    return res.json({
      success: true,
      connected: true,
      isValid: true,
      isExpired: false,
      usingRefreshToken: true,
    });
  }

  try {
    const tokenInfo = await googleClient.getTokenInfo(user.googleAccessToken);

    return res.json({
      success: true,
      connected: true,
      isValid: true,
      isExpired: false,
      expiresIn: tokenInfo?.expires_in,
    });
  } catch (_error) {
    if (user.googleRefreshToken) {
      return res.json({
        success: true,
        connected: true,
        isValid: true,
        isExpired: false,
        usingRefreshToken: true,
      });
    }

    return res.json({
      success: true,
      connected: true,
      isValid: false,
      isExpired: true,
    });
  }
});


export const signupUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error("All fields are required");
  }

  const userExists = await User.findOne({ email });

  if (userExists) {
    if (userExists.googleId) {
      res.status(400);
      throw new Error(
        "This email is registered with Google. Please sign in with Google."
      );
    }

    res.status(400);
    throw new Error("User already exists");
  }

  const otp = generateOTP();
  const otpExpires = Date.now() + 10 * 60 * 1000;

  const user = await User.create({
    name,
    email,
    password,
    otp,
    otpExpires,
  });

  await sendEmail({
    to: user.email,
    subject: "Verify your email",
    text: `Your OTP for email verification is ${otp}. It will expire in 10 minutes.`,
  });

  res.status(201).json({
    success: true,
    message: "User registered successfully. Verify OTP.",
    userId: user._id,
  });
});


export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    res.status(400);
    throw new Error("Email and OTP are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.isEmailVerified) {
    res.status(400);
    throw new Error("Email already verified");
  }

  if (user.otp !== otp) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  if (user.otpExpires < Date.now()) {
    res.status(400);
    throw new Error("OTP expired");
  }

  user.isEmailVerified = true;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: "Email verified successfully",
    accessToken,
  });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Email and password are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(400);
    throw new Error("Invalid email or password");
  }

  if (!user.isEmailVerified) {
    res.status(403);
    throw new Error("Please verify your email first");
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(400);
    throw new Error("Invalid email or password");
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, 
  });

  res.json({
    success: true,
    message: "Login successful",
    accessToken,
  });

});


export const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    res.status(401);
    throw new Error("No refresh token found");
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET
    );

    const newAccessToken = generateAccessToken(decoded.id);

    res.json({
      success: true,
      accessToken: newAccessToken,
    });
  } catch (error) {
    res.status(401);
    throw new Error("Invalid or expired refresh token");
  }

});

export const logoutUser = asyncHandler(async (req, res) => {
  res.cookie("refreshToken", "", {
    httpOnly: true,
    expires: new Date(0), 
  });

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});


export const resendOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }


  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail({
    to: user.email,
    subject: "OTP",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });

  res.json({
    success: true,
    message: "OTP resent successfully",
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error("Email is required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.googleId) {
    res.status(400);
    throw new Error(
      "This account uses Google login. Please sign in with Google."
    );
  }

  const otp = generateOTP();
  user.otp = otp;
  user.otpExpires = Date.now() + 10 * 60 * 1000;

  await user.save();

  await sendEmail({
    to: user.email,
    subject: "Password Reset OTP",
    text: `Your OTP to reset password is ${otp}. It will expire in 10 minutes.`,
  });

  res.json({
    success: true,
    message: "Password reset OTP sent to email",
  });
});


export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    res.status(400);
    throw new Error("Email, OTP and new password are required");
  }

  const user = await User.findOne({ email });

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (user.googleId) {
    res.status(400);
    throw new Error("Google accounts cannot reset password.");
  }

  if (user.otp !== otp) {
    res.status(400);
    throw new Error("Invalid OTP");
  }

  if (user.otpExpires < Date.now()) {
    res.status(400);
    throw new Error("OTP expired");
  }

  user.password = newPassword;
  user.otp = undefined;
  user.otpExpires = undefined;

  await user.save();

  res.json({
    success: true,
    message: "Password reset successful. Please login again.",
  });
});



export const googleLogin = asyncHandler(async (req, res) => {
  const { tokenId } = req.body;

  if (!tokenId) {
    res.status(400);
    throw new Error("Google token is required");
  }

  let payload;
  try {
    payload = await verifyGoogleTokenWithFallback(tokenId);
  } catch (error) {
    res.status(503);
    throw new Error(
      "Google login verification failed. Check internet/certificate access to googleapis.com, or set ALLOW_INSECURE_GOOGLE_LOGIN=true for local development only."
    );
  }

  const { sub, email, name } = payload;

  if (!email) {
    res.status(400);
    throw new Error("Google account email not found");
  }

  let user = await User.findOne({ email });

  if (user && !user.googleId) {
    res.status(400);
    throw new Error(
      "Account already exists with email/password. Please login normally."
    );
  }

  if (!user) {
    user = await User.create({
      name,
      email,
      googleId: sub,
      isEmailVerified: true,
      password: undefined, 
    });
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    message: "Google login successful",
    accessToken,
  });
});