import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">Smart Scheduler</div>

        <div className="nav-actions">
          <button
            className="login-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>

          {/* <button
            className="signup-btn"
            onClick={() => navigate("/signup")}
          >
            Signup
          </button> */}
        </div>
      </nav>

      <div className="hero">

        <h1 className="hero-title">
          Organize Your Schedule Smarter
        </h1>

        <p className="hero-subtitle">
          Let AI read your emails and automatically schedule events
          into your calendar. Focus on your work while we handle
          the planning.
        </p>

        <button
          className="cta-button"
          onClick={() => navigate("/signup")}
        >
          Get Started
        </button>

      </div>

    </div>
  );
}

export default Landing;