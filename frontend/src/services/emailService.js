import api from "./api";

/**
 * Email-related API calls
 */

// Get email preferences
export const getEmailPreferences = async () => {
  try {
    const response = await api.get("/email/preferences");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update email preferences
export const updateEmailPreferences = async (preferences) => {
  try {
    const response = await api.put("/email/preferences", preferences);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// ============= ALLOWED EMAIL SENDERS (WHITELIST) =============

// Get all allowed email senders (whitelist)
export const getAllowedEmailSenders = async () => {
  try {
    const response = await api.get("/email/allowed-senders");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Add allowed email sender to whitelist
export const addAllowedEmailSender = async (email, displayName = "") => {
  try {
    const response = await api.post("/email/allowed-senders", { email, displayName });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Remove allowed email sender from whitelist
export const removeAllowedEmailSender = async (email) => {
  try {
    const response = await api.delete("/email/allowed-senders", { data: { email } });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Toggle allowed email sender active/inactive
export const toggleAllowedEmailSender = async (email) => {
  try {
    const response = await api.patch("/email/allowed-senders", { email });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Update whitelist enforcement setting
export const updateWhitelistEnforcement = async (enforceWhitelist) => {
  try {
    const response = await api.patch("/email/whitelist-enforcement", { enforceWhitelist });
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
