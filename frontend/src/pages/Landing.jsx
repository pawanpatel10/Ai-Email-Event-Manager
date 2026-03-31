import { useNavigate } from "react-router-dom";
import "./Landing.css";

function Landing() {
  const navigate = useNavigate();

  return (
    <div className="landing-container">

      {/* Hero Section */}
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