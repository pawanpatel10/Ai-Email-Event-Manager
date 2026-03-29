import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getEmailPreferences,
  updateEmailPreferences,
  getAllowedEmailSenders,
  updateWhitelistEnforcement,
} from "../services/emailService";
import { getUserInfo } from "../services/authService";
import "./Settings.css";

export default function Settings() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [googleConnected, setGoogleConnected] = useState(false);
  const [allowedSenderCount, setAllowedSenderCount] = useState(0);

  const [preferences, setPreferences] = useState({
    schedulerEnabled: true,
    autoSchedule: false,
    requireConfirmation: true,
    autoCalendarSync: true,
    enforceWhitelist: true,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchSettings();
  }, [authLoading, isAuthenticated, navigate]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError("");

      const [prefsRes, whitelistRes, meRes] = await Promise.all([
        getEmailPreferences(),
        getAllowedEmailSenders(),
        getUserInfo(),
      ]);

      const prefs = prefsRes?.preferences || {};
      const enforceWhitelist = whitelistRes?.enforceWhitelist ?? true;
      const activeAllowedSenders = (whitelistRes?.allowedSenders || []).filter(
        (sender) => sender.isActive
      );

      setPreferences({
        schedulerEnabled: prefs.schedulerEnabled ?? true,
        autoSchedule: !!prefs.autoSchedule,
        requireConfirmation: prefs.requireConfirmation ?? true,
        autoCalendarSync: prefs.autoCalendarSync ?? true,
        enforceWhitelist,
      });

      setAllowedSenderCount(activeAllowedSenders.length);
      setGoogleConnected(!!meRes?.user?.googleAccessToken);
    } catch (err) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError("");

      await updateEmailPreferences({
        schedulerEnabled: preferences.schedulerEnabled,
        autoSchedule: preferences.autoSchedule,
        requireConfirmation: preferences.requireConfirmation,
        autoCalendarSync: preferences.autoCalendarSync,
      });

      await updateWhitelistEnforcement(preferences.enforceWhitelist);

      setSuccessMessage("Settings saved successfully.");
      setTimeout(() => setSuccessMessage(""), 2500);
    } catch (err) {
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="settings-page">Loading settings...</div>;
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Control scheduling behavior, privacy, and calendar sync.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="settings-grid">
        <section className="settings-card">
          <h2>Automation</h2>

          <label className="setting-row">
            <span className="setting-title">Automatic Email Scheduling</span>
            <input
              type="checkbox"
              checked={preferences.schedulerEnabled}
              onChange={() => handleToggle("schedulerEnabled")}
            />
          </label>
          <p className="setting-desc">
            When disabled, automatic email scheduling stops immediately and resumes only after re-enabling.
          </p>

          <label className="setting-row">
            <span className="setting-title">Auto Schedule Events</span>
            <input
              type="checkbox"
              checked={preferences.autoSchedule}
              onChange={() => handleToggle("autoSchedule")}
            />
          </label>
          <p className="setting-desc">
            Automatically schedule detected events without waiting for approval.
          </p>

          <label className="setting-row">
            <span className="setting-title">Require Confirmation</span>
            <input
              type="checkbox"
              checked={preferences.requireConfirmation}
              onChange={() => handleToggle("requireConfirmation")}
            />
          </label>
          <p className="setting-desc">
            Keep events in pending state until you manually confirm.
          </p>

          <label className="setting-row">
            <span className="setting-title">Auto Calendar Sync</span>
            <input
              type="checkbox"
              checked={preferences.autoCalendarSync}
              onChange={() => handleToggle("autoCalendarSync")}
            />
          </label>
          <p className="setting-desc">
            Push confirmed events directly to Google Calendar.
          </p>
        </section>

        <section className="settings-card">
          <h2>Privacy</h2>

          <label className="setting-row">
            <span className="setting-title">Enforce Sender Whitelist</span>
            <input
              type="checkbox"
              checked={preferences.enforceWhitelist}
              onChange={() => handleToggle("enforceWhitelist")}
            />
          </label>
          <p className="setting-desc">
            Only process emails from approved sender IDs.
          </p>

          <div className="status-box">
            <div>
              <strong>Active Allowed Senders:</strong> {allowedSenderCount}
            </div>
            <button className="btn btn-secondary" onClick={() => navigate("/email-config")}>Manage Allowed Senders</button>
          </div>
        </section>

        <section className="settings-card">
          <h2>Google Connection</h2>
          <div className={`connection-pill ${googleConnected ? "connected" : "disconnected"}`}>
            {googleConnected ? "Google Calendar Connected" : "Google Calendar Not Connected"}
          </div>
          <p className="setting-desc">
            Connect or refresh Google permissions from the Home page card.
          </p>
          <button className="btn btn-primary" onClick={() => navigate("/home")}>Go To Home</button>
        </section>
      </div>

      <div className="settings-actions">
        <button className="btn btn-primary btn-lg" onClick={handleSaveSettings} disabled={saving}>
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
