import User from "../models/User.js";
import asyncHandler from "../middlewares/asyncHandler.js";

// @desc    Add email to monitoring list
// @route   POST /api/email/add-email
// @access  Private
export const addConnectedEmail = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email address is required",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Check if email already exists
  const emailExists = user.connectedEmails.some(
    (e) => e.email.toLowerCase() === email.toLowerCase()
  );

  if (emailExists) {
    return res.status(400).json({
      success: false,
      message: "Email already connected",
    });
  }

  // Add email
  user.connectedEmails.push({
    email: email.toLowerCase(),
    isActive: true,
  });

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email connected successfully",
    connectedEmails: user.connectedEmails,
  });
});

// @desc    Get all connected emails
// @route   GET /api/email/connected-emails
// @access  Private
export const getConnectedEmails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    connectedEmails: user.connectedEmails,
  });
});

// @desc    Remove connected email
// @route   DELETE /api/email/connected-emails/:emailId
// @access  Private
export const removeConnectedEmail = asyncHandler(async (req, res) => {
  const { emailId } = req.params;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Remove email from connected emails
  user.connectedEmails = user.connectedEmails.filter(
    (e) => e._id.toString() !== emailId
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email removed successfully",
    connectedEmails: user.connectedEmails,
  });
});

// @desc    Toggle connected email active status
// @route   PATCH /api/email/connected-emails/:emailId/toggle
// @access  Private
export const toggleConnectedEmail = asyncHandler(async (req, res) => {
  const { emailId } = req.params;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const email = user.connectedEmails.find(
    (e) => e._id.toString() === emailId
  );

  if (!email) {
    return res.status(404).json({
      success: false,
      message: "Email not found",
    });
  }

  email.isActive = !email.isActive;
  await user.save();

  res.status(200).json({
    success: true,
    message: "Email status updated successfully",
    connectedEmails: user.connectedEmails,
  });
});

// @desc    Update email preferences
// @route   PATCH /api/email/preferences
// @access  Private
export const updateEmailPreferences = asyncHandler(async (req, res) => {
  const {
    schedulerEnabled,
    autoSchedule,
    requireConfirmation,
    autoCalendarSync,
    eventKeywords,
  } = req.body;

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (schedulerEnabled !== undefined) user.emailPreferences.schedulerEnabled = schedulerEnabled;
  if (autoSchedule !== undefined) user.emailPreferences.autoSchedule = autoSchedule;
  if (requireConfirmation !== undefined) user.emailPreferences.requireConfirmation = requireConfirmation;
  if (autoCalendarSync !== undefined) user.emailPreferences.autoCalendarSync = autoCalendarSync;
  if (eventKeywords) user.emailPreferences.eventKeywords = eventKeywords;

  await user.save();

  res.status(200).json({
    success: true,
    message: "Preferences updated successfully",
    preferences: user.emailPreferences,
  });
});

// @desc    Get email preferences
// @route   GET /api/email/preferences
// @access  Private
export const getEmailPreferences = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    preferences: user.emailPreferences,
  });
});

// ============= ALLOWED EMAIL SENDERS (WHITELIST) =============

// @desc    Get all allowed email senders (whitelist)
// @route   GET /api/email/allowed-senders
// @access  Private
export const getAllowedEmailSenders = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    allowedSenders: user.allowedEmailSenders || [],
    enforceWhitelist: user.emailPreferences?.enforceWhitelist ?? true,
  });
});

// @desc    Add allowed email sender to whitelist
// @route   POST /api/email/allowed-senders
// @access  Private
export const addAllowedEmailSender = asyncHandler(async (req, res) => {
  const { email, displayName } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email format",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  // Check if already exists
  const exists = user.allowedEmailSenders?.some(
    (s) => s.email.toLowerCase() === email.toLowerCase()
  );

  if (exists) {
    return res.status(400).json({
      success: false,
      message: "Email sender already in whitelist",
    });
  }

  if (!user.allowedEmailSenders) {
    user.allowedEmailSenders = [];
  }

  user.allowedEmailSenders.push({
    email: email.toLowerCase(),
    displayName: displayName || email,
    isActive: true,
  });

  await user.save();

  res.status(201).json({
    success: true,
    message: "Email sender added to whitelist",
    allowedSenders: user.allowedEmailSenders,
  });
});

// @desc    Remove allowed email sender from whitelist
// @route   DELETE /api/email/allowed-senders
// @access  Private
export const removeAllowedEmailSender = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  user.allowedEmailSenders = (user.allowedEmailSenders || []).filter(
    (s) => s.email.toLowerCase() !== email.toLowerCase()
  );

  await user.save();

  res.status(200).json({
    success: true,
    message: "Email sender removed from whitelist",
    allowedSenders: user.allowedEmailSenders,
  });
});

// @desc    Toggle allowed email sender active/inactive
// @route   PATCH /api/email/allowed-senders
// @access  Private
export const toggleAllowedEmailSender = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: "Email is required",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const sender = user.allowedEmailSenders?.find(
    (s) => s.email.toLowerCase() === email.toLowerCase()
  );

  if (!sender) {
    return res.status(404).json({
      success: false,
      message: "Email sender not in whitelist",
    });
  }

  sender.isActive = !sender.isActive;

  await user.save();

  res.status(200).json({
    success: true,
    message: `Email sender ${sender.isActive ? "enabled" : "disabled"}`,
    allowedSenders: user.allowedEmailSenders,
  });
});

// @desc    Update whitelist enforcement setting
// @route   PATCH /api/email/whitelist-enforcement
// @access  Private
export const updateWhitelistEnforcement = asyncHandler(async (req, res) => {
  const { enforceWhitelist } = req.body;

  if (typeof enforceWhitelist !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "enforceWhitelist must be a boolean",
    });
  }

  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!user.emailPreferences) {
    user.emailPreferences = {};
  }

  user.emailPreferences.enforceWhitelist = enforceWhitelist;

  await user.save();

  res.status(200).json({
    success: true,
    message: `Whitelist enforcement ${enforceWhitelist ? "enabled" : "disabled"}`,
    emailPreferences: user.emailPreferences,
  });
});
