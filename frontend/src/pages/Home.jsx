import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutApi } from "../services/authService";
import ProfilePopup from "../components/ProfilePopup";
import "./Home.css";

function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");

  const handleLogout = async () => {
    try {
      await logoutApi(); 
    } catch (err) {
      console.error(err);
    } finally {
      logout();
      navigate("/");
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <svg className="brand-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className="brand-title">Dashboard</span>
        </div>

        <div className="navbar-links">
          <button 
            className={`nav-link ${activeTab === 'Home' ? 'active' : ''}`}
            onClick={() => setActiveTab('Home')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Home
          </button>
          <button 
            className={`nav-link ${activeTab === 'Calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('Calendar')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Calendar
          </button>
        </div>

        <div className="navbar-profile" style={{ position: 'relative' }}>
          <button className="profile-btn" onClick={() => setShowProfileMenu(true)}>
            <div className="profile-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="profile-name">My Info</span>
          </button>

          {showProfileMenu && (
            <ProfilePopup onClose={() => setShowProfileMenu(false)} />
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="dashboard-content">
        <header className="content-header">
          <h1>{activeTab === 'Home' ? 'Welcome Back!' : 'Your Calendar'}</h1>
          <p className="subtitle">
            {activeTab === 'Home' 
              ? 'Here is an overview of your events and tasks today.' 
              : 'Manage your schedule and upcoming meetings.'}
          </p>
        </header>

        <div className="content-body">
          {activeTab === 'Home' ? (
            <div className="dashboard-cards">
              <div className="dash-card">
                <h3>Upcoming Events</h3>
                <div className="card-placeholder">No events today</div>
              </div>
              <div className="dash-card">
                <h3>Recent Emails</h3>
                <div className="card-placeholder">No recent emails</div>
              </div>
              <div className="dash-card">
                <h3>AI Insights</h3>
                <div className="card-placeholder">Everything looks good!</div>
              </div>
            </div>
          ) : (
            <div className="calendar-view">
              <div className="calendar-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <p>Interactive Calendar Coming Soon</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;
