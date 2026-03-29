import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getEmailPreferences,
  updateEmailPreferences,
  getAllowedEmailSenders,
  addAllowedEmailSender,
  removeAllowedEmailSender,
  toggleAllowedEmailSender,
  updateWhitelistEnforcement,
} from "../services/emailService";
import "./EmailConfig.css";

export default function EmailConfig() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [allowedSenders, setAllowedSenders] = useState([]);
  const [enforceWhitelist, setEnforceWhitelist] = useState(true);
  const [newAllowedEmail, setNewAllowedEmail] = useState("");
  const [newAllowedDisplayName, setNewAllowedDisplayName] = useState("");
  const [preferences, setPreferences] = useState({
    schedulerEnabled: true,
    autoSchedule: false,
    requireConfirmation: true,
    autoCalendarSync: true,
    eventKeywords: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const activeSendersCount = allowedSenders.filter((sender) => sender.isActive).length;

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [isAuthenticated, authLoading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const prefsRes = await getEmailPreferences();
      setPreferences(prefsRes.preferences || preferences);

      // Load allowed senders (whitelist)
      const whitelistRes = await getAllowedEmailSenders();
      setAllowedSenders(whitelistRes.allowedSenders || []);
      setEnforceWhitelist(whitelistRes.enforceWhitelist ?? true);
    } catch (err) {
      setError("Failed to load email configuration");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Whitelist handlers
  const handleAddAllowedSender = async (e) => {
    e.preventDefault();
    if (!newAllowedEmail.trim()) {
      setError("Please enter an email address");
      return;
    }

    try {
      setError("");
      const res = await addAllowedEmailSender(newAllowedEmail, newAllowedDisplayName);
      setAllowedSenders(res.allowedSenders || []);
      setNewAllowedEmail("");
      setNewAllowedDisplayName("");
      setSuccessMessage("Email sender added to whitelist!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to add email to whitelist");
    }
  };

  const handleRemoveAllowedSender = async (email) => {
    if (window.confirm("Are you sure you want to remove this sender from the whitelist?")) {
      try {
        setError("");
        const res = await removeAllowedEmailSender(email);
        setAllowedSenders(res.allowedSenders || []);
        setSuccessMessage("Email sender removed from whitelist!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setError(err.message || "Failed to remove sender from whitelist");
      }
    }
  };

  const handleToggleAllowedSender = async (email) => {
    try {
      setError("");
      const res = await toggleAllowedEmailSender(email);
      setAllowedSenders(res.allowedSenders || []);
    } catch (err) {
      setError(err.message || "Failed to toggle sender status");
    }
  };

  const handleToggleWhitelist = async () => {
    try {
      setError("");
      const res = await updateWhitelistEnforcement(!enforceWhitelist);
      setEnforceWhitelist(!enforceWhitelist);
      setSuccessMessage(`Whitelist enforcement ${!enforceWhitelist ? "enabled" : "disabled"}!`);
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to update whitelist enforcement");
    }
  };

  const handlePreferenceChange = (key, value) => {
    setPreferences({
      ...preferences,
      [key]: value,
    });
  };

  const handleSavePreferences = async () => {
    try {
      setError("");
      await updateEmailPreferences(preferences);
      setSuccessMessage("Preferences saved successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save preferences");
    }
  };

  if (loading) {
    return <div className="email-config-container loading-state">Loading email configuration...</div>;
  }

  return (
    <div className="email-config-container">
      <div className="email-config-header">
        <h1>Email Configuration</h1>
        <p>Control which senders are trusted and how detected events are handled.</p>
      </div>

      <div className="stats-strip">
        <div className="stat-card">
          <span className="stat-label">Whitelist Mode</span>
          <span className={`stat-value ${enforceWhitelist ? "state-on" : "state-off"}`}>
            {enforceWhitelist ? "Enabled" : "Disabled"}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Allowed Senders</span>
          <span className="stat-value">{allowedSenders.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active Senders</span>
          <span className="stat-value">{activeSendersCount}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="email-config-grid">
        {/* Allowed Senders (Whitelist) Section - Security First */}
        <section className="email-config-section whitelist-section">
          <div className="section-header">
            <h2>Allowed Email Senders (Security Whitelist)</h2>
            <div className="whitelist-toggle">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={enforceWhitelist}
                  onChange={handleToggleWhitelist}
                />
                <span>Enforce Whitelist</span>
              </label>
              <span className="toggle-desc">
                {enforceWhitelist ? "Only process emails from allowed senders" : "Allow processing from any sender"}
              </span>
            </div>
          </div>

          {enforceWhitelist && (
            <>
              <p className="section-info">
                Only emails from these addresses will be processed by the app. This protects your personal data from being read.
              </p>

              <form onSubmit={handleAddAllowedSender} className="add-email-form">
                <input
                  type="email"
                  value={newAllowedEmail}
                  onChange={(e) => setNewAllowedEmail(e.target.value)}
                  placeholder="Email address (e.g., boss@company.com)"
                  className="email-input"
                />
                <input
                  type="text"
                  value={newAllowedDisplayName}
                  onChange={(e) => setNewAllowedDisplayName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="email-input"
                />
                <button type="submit" className="btn btn-primary">
                  Add Sender
                </button>
              </form>

              <div className="senders-list">
                {allowedSenders.length === 0 ? (
                  <p className="empty-state">⚠️ No allowed senders configured. Email processing is disabled.</p>
                ) : (
                  <div className="senders-table">
                    {allowedSenders.map((sender) => (
                      <div key={sender.email} className="sender-item">
                        <div className="sender-info">
                          <span className="sender-email">{sender.email}</span>
                          {sender.displayName && <span className="sender-name">{sender.displayName}</span>}
                          <span className="sender-status">
                            {sender.isActive ? "✓ Active" : "○ Inactive"}
                          </span>
                        </div>
                        <div className="sender-actions">
                          <button
                            onClick={() => handleToggleAllowedSender(sender.email)}
                            className={`btn btn-sm ${
                              sender.isActive ? "btn-secondary" : "btn-success"
                            }`}
                          >
                            {sender.isActive ? "Disable" : "Enable"}
                          </button>
                          <button
                            onClick={() => handleRemoveAllowedSender(sender.email)}
                            className="btn btn-sm btn-danger"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {!enforceWhitelist && (
            <p className="warning-message">
              ⚠️ Whitelist is disabled. The app can access emails from any sender. Enable whitelist to protect your privacy.
            </p>
          )}
        </section>

      </div>

      {/* Preferences Section */}
      <section className="email-config-section preferences-section">
        <h2>Email Preferences</h2>
        <div className="preferences-grid">
          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.schedulerEnabled ?? true}
              onChange={(e) =>
                handlePreferenceChange("schedulerEnabled", e.target.checked)
              }
            />
            <span className="preference-label">Enable Automatic Scheduling</span>
            <span className="preference-desc">
              Turn automatic email scheduling on or off. When off, new emails are not auto-processed.
            </span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.autoSchedule}
              onChange={(e) =>
                handlePreferenceChange("autoSchedule", e.target.checked)
              }
            />
            <span className="preference-label">Auto Schedule Events</span>
            <span className="preference-desc">
              Automatically schedule detected events without confirmation
            </span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.requireConfirmation}
              onChange={(e) =>
                handlePreferenceChange("requireConfirmation", e.target.checked)
              }
            />
            <span className="preference-label">Require Confirmation</span>
            <span className="preference-desc">
              Ask for your approval before scheduling events
            </span>
          </label>

          <label className="preference-item">
            <input
              type="checkbox"
              checked={preferences.autoCalendarSync}
              onChange={(e) =>
                handlePreferenceChange("autoCalendarSync", e.target.checked)
              }
            />
            <span className="preference-label">Auto Sync to Calendar</span>
            <span className="preference-desc">
              Automatically add confirmed events to Google Calendar
            </span>
          </label>
        </div>

        <button
          onClick={handleSavePreferences}
          className="btn btn-primary btn-lg"
        >
          Save Preferences
        </button>
      </section>
    </div>
  );
}
