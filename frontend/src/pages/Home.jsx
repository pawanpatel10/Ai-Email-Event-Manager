import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  getGoogleClientConfig,
  getGoogleTokenStatus,
  saveGoogleAuthCode,
} from "../services/authService";
import "./Home.css";

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [googleConnectLoading, setGoogleConnectLoading] = useState(false);
  const [googleTokenState, setGoogleTokenState] = useState("not-connected");

  useEffect(() => {
    const loadConnectionStatus = async () => {
      try {
        const status = await getGoogleTokenStatus();
        if (!status?.connected) {
          setGoogleTokenState("not-connected");
          return;
        }

        setGoogleTokenState(status.isValid ? "valid" : "expired");
      } catch {
        // Ignore status check failure and keep connect button enabled.
        setGoogleTokenState("not-connected");
      }
    };

    loadConnectionStatus();
  }, []);

  const handleConnectGoogleServices = async () => {
    if (!window.google?.accounts?.oauth2) {
      alert("Google OAuth script is not loaded. Refresh and try again.");
      return;
    }

    setGoogleConnectLoading(true);

    try {
      const config = await getGoogleClientConfig();

      const codeClient = window.google.accounts.oauth2.initCodeClient({
        client_id: config.clientId,
        scope:
          "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events openid email profile",
        ux_mode: "popup",
        callback: async (codeResponse) => {
          try {
            if (!codeResponse?.code) {
              throw new Error("Google did not return an authorization code.");
            }

            await saveGoogleAuthCode(codeResponse.code);
            setGoogleTokenState("valid");
            alert("Google services connected successfully with long-lived access.");
          } catch (error) {
            const message =
              error.response?.data?.message ||
              error.message ||
              "Failed to connect Google services";

            if (message.toLowerCase().includes("insufficient google permissions")) {
              alert(
                "Google permissions are incomplete. Reconnect and allow both Gmail read-only and Calendar event access."
              );
            } else {
              alert(message);
            }
          } finally {
            setGoogleConnectLoading(false);
          }
        },
      });

      codeClient.requestCode({
        prompt: "consent",
      });
    } catch (error) {
      setGoogleConnectLoading(false);
      alert(error.response?.data?.message || "Google login is not configured");
    }
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-content">
          <h1>Welcome to Email Event Manager</h1>
          <p>Automatically detect and schedule events from your emails</p>
        </div>
      </header>

      <div className="home-user-info">
        <p>Hello, <strong>{user?.name || "User"}</strong>!</p>
      </div>

      <div className="features-grid">
        <div className="feature-card" onClick={() => navigate("/email-config")}>
          <div className="feature-icon">📧</div>
          <h3>Email Configuration</h3>
          <p>Add and manage email addresses to monitor for events</p>
          <button className="btn-feature">Configure Emails</button>
        </div>

        <div className="feature-card" onClick={() => navigate("/dashboard")}>
          <div className="feature-icon">📅</div>
          <h3>Event Dashboard</h3>
          <p>View, confirm, and manage detected events</p>
          <button className="btn-feature">View Dashboard</button>
        </div>

        <div className="feature-card" onClick={() => navigate("/settings")}>
          <div className="feature-icon">⚙️</div>
          <h3>Settings</h3>
          <p>Customize your preferences and notification settings</p>
          <button className="btn-feature">Open Settings</button>
        </div>

        <div className="feature-card">
          <div className="feature-icon">🔐</div>
          <h3>Connected Services</h3>
          <p>
            {googleTokenState === "valid"
              ? "Google is connected and token is valid."
              : googleTokenState === "expired"
              ? "Google token is expired. Reconnect to resume automatic scheduling."
              : "Connect your Google Calendar and Gmail access for automatic scheduling."}
          </p>
          <button
            className="btn-feature"
            onClick={handleConnectGoogleServices}
            disabled={googleConnectLoading || googleTokenState === "valid"}
          >
            {googleConnectLoading
              ? "Connecting..."
              : googleTokenState === "expired"
              ? "Reconnect Google"
              : googleTokenState === "valid"
              ? "Google Connected"
              : "Connect Google"}
          </button>
        </div>
      </div>

      <section className="info-section">
        <h2>How It Works</h2>
        <div className="steps">
          <div className="step">
            <span className="step-number">1</span>
            <h4>Configure Email Addresses</h4>
            <p>Add the email addresses you want to monitor for events</p>
          </div>
          <div className="step">
            <span className="step-number">2</span>
            <h4>Email Analysis</h4>
            <p>The system automatically analyzes incoming emails using AI</p>
          </div>
          <div className="step">
            <span className="step-number">3</span>
            <h4>Event Detection</h4>
            <p>Potential events are identified and extracted from emails</p>
          </div>
          <div className="step">
            <span className="step-number">4</span>
            <h4>Confirmation</h4>
            <p>Review and confirm events before they're added to your calendar</p>
          </div>
          <div className="step">
            <span className="step-number">5</span>
            <h4>Calendar Sync</h4>
            <p>Approved events are automatically synced to Google Calendar</p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
