import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login as loginApi, getUserInfo } from "../services/authService";
import { useAuth } from "../context/AuthContext";
import "./Login.css";
import GoogleLoginButton from "../components/GoogleLoginButton";

function Login() {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await loginApi(form);
      login(res.accessToken);
      
      // Fetch user info after token is stored so /auth/me has Authorization header.
      try {
        const userInfo = await getUserInfo();
        login(res.accessToken, userInfo.user);
      } catch (_profileError) {
        // User profile fetch failure should not block login.
      }

      navigate("/home");
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";

      if (message.toLowerCase().includes("verify your email")) {
        alert("Your email is not verified yet. Please verify OTP first.");
        navigate("/verify-otp", { state: { email: form.email } });
      } else {
        alert(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card login-card">
        <h2 className="login-title">Login</h2>

        <form onSubmit={handleSubmit}>
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <hr style={{ margin: "1rem 0" }} />
        <GoogleLoginButton />


        <p className="login-footer">
          Forgot password?{" "}
          <span onClick={() => navigate("/forgot-password")}>
            Reset
          </span>
        </p>

        <p className="login-footer">
          Don’t have an account?{" "}
          <span onClick={() => navigate("/signup")}>
            Signup
          </span>
        </p>
      </div>
    </div>
  );
}

export default Login;
