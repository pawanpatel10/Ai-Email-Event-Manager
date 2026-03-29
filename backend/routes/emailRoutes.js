import express from "express";
import {
  addConnectedEmail,
  getConnectedEmails,
  removeConnectedEmail,
  toggleConnectedEmail,
  updateEmailPreferences,
  getEmailPreferences,
  getAllowedEmailSenders,
  addAllowedEmailSender,
  removeAllowedEmailSender,
  toggleAllowedEmailSender,
  updateWhitelistEnforcement,
} from "../controllers/emailController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Email management
router.post("/connected-emails", addConnectedEmail);
router.get("/connected-emails", getConnectedEmails);
router.delete("/connected-emails/:emailId", removeConnectedEmail);
router.patch("/connected-emails/:emailId/toggle", toggleConnectedEmail);

// Preferences
router.put("/preferences", updateEmailPreferences);
router.get("/preferences", getEmailPreferences);

// Allowed email senders (whitelist)
router.get("/allowed-senders", getAllowedEmailSenders);
router.post("/allowed-senders", addAllowedEmailSender);
router.delete("/allowed-senders", removeAllowedEmailSender);
router.patch("/allowed-senders", toggleAllowedEmailSender);
router.patch("/whitelist-enforcement", updateWhitelistEnforcement);

export default router;
