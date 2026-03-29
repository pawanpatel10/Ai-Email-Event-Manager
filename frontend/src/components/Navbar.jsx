import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  // Don't show navbar on auth pages
  const authPages = ["/login", "/signup", "/verify-otp", "/forgot-password", "/reset-password"];
  if (authPages.includes(location.pathname)) {
    return null;
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand" aria-label="Event Scheduler">
          <span className="navbar-logo">📅 EventScheduler</span>
        </div>

        {/* Hamburger menu button */}
        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="hamburger"></span>
          <span className="hamburger"></span>
          <span className="hamburger"></span>
        </button>

        {/* Navigation links */}
        <div className={`navbar-menu ${menuOpen ? "active" : ""}`}>
          {isAuthenticated ? (
            <>
              <div className="navbar-left">
                <Link
                  to="/home"
                  className={`navbar-link ${isActive("/home") ? "active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Home
                </Link>
                <Link
                  to="/email-config"
                  className={`navbar-link ${isActive("/email-config") ? "active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Email Config
                </Link>
                <Link
                  to="/settings"
                  className={`navbar-link ${isActive("/settings") ? "active" : ""}`}
                  onClick={() => setMenuOpen(false)}
                >
                  Settings
                </Link>
              </div>

              <div className="navbar-right">
                <button
                  onClick={() => {
                    handleLogout();
                    setMenuOpen(false);
                  }}
                  className="navbar-link logout-btn"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className={`navbar-link ${isActive("/login") ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className={`navbar-link ${isActive("/signup") ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
