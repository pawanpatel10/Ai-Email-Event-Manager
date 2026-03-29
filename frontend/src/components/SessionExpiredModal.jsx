import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./SessionExpiredModal.css";

export default function SessionExpiredModal() {
  const { sessionExpired, clearSessionExpiredFlag } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionExpired) {
      window.scrollTo(0, 0);
      navigate("/login", { replace: true });
      clearSessionExpiredFlag();
    }
  }, [sessionExpired, navigate, clearSessionExpiredFlag]);

  const handleLoginRedirect = () => {
    clearSessionExpiredFlag();
    navigate("/login");
  };

  if (!sessionExpired) {
    return null;
  }

  return (
    <div className="session-expired-overlay">
      <div className="session-expired-modal">
        <div className="modal-icon">⏱️</div>
        <h2>Session Expired</h2>
        <p>Your login session has expired. Please log in again to continue.</p>
        <button className="btn btn-primary btn-lg" onClick={handleLoginRedirect}>
          Go to Login
        </button>
      </div>
    </div>
  );
}
