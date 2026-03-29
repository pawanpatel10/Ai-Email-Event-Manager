import { useEffect, useRef, useState } from "react";
import {
  getGoogleClientConfig,
  googleLogin,
  saveGoogleAuthCode,
  saveGoogleToken,
} from "../services/authService";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

function GoogleLoginButton() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const googleBtnRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    let isMounted = true;
    let retryTimer;

    const initGoogle = async (attempt = 0) => {
      if (!isMounted) return;

      if (!window.google || !googleBtnRef.current) {
        if (attempt < 30) {
          retryTimer = setTimeout(() => initGoogle(attempt + 1), 200);
        } else {
          setStatus("script-unavailable");
        }
        return;
      }

      let clientId = "";
      try {
        const config = await getGoogleClientConfig();
        clientId = config.clientId;
      } catch (_err) {
        if (isMounted) setStatus("config-error");
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          try {
            const res = await googleLogin(response.credential);
            // Store user info from Google login response if available
            const userData = res.user || { name: res.email };
            login(res.accessToken, userData);

            if (window.google?.accounts?.oauth2) {
              const codeClient = window.google.accounts.oauth2.initCodeClient({
                client_id: clientId,
                scope:
                  "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events openid email profile",
                ux_mode: "popup",
                callback: async (codeResponse) => {
                  if (!codeResponse?.code) {
                    return;
                  }

                  try {
                    await saveGoogleAuthCode(codeResponse.code);
                  } catch (_codeError) {
                    // Fallback: keep app usable with short-lived token if code exchange fails.
                    const tokenClient = window.google.accounts.oauth2.initTokenClient({
                      client_id: clientId,
                      scope:
                        "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.events openid email profile",
                      callback: async (tokenResponse) => {
                        if (!tokenResponse?.access_token) {
                          return;
                        }

                        try {
                          await saveGoogleToken(tokenResponse.access_token);
                        } catch (_tokenError) {
                          // Login should still succeed even if service token save fails.
                        }
                      },
                    });

                    tokenClient.requestAccessToken({ prompt: "consent" });
                  }
                },
              });

              codeClient.requestCode({
                prompt: "consent",
              });
            }

            navigate("/home");
          } catch (err) {
            alert(
              err.response?.data?.message ||
                "Google login failed. Try another method."
            );
          }
        },
      });

      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 260,
      });
      if (isMounted) setStatus("ready");
    };

    initGoogle();

    return () => {
      isMounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [login, navigate]);

  return (
    <div>
      <div ref={googleBtnRef}></div>
      {status === "loading" && <p style={{ fontSize: "12px", marginTop: "8px" }}>Loading Google login...</p>}
      {status === "script-unavailable" && (
        <p style={{ fontSize: "12px", marginTop: "8px", color: "#b00020" }}>
          Google script did not load. Refresh the page and try again.
        </p>
      )}
      {status === "config-error" && (
        <p style={{ fontSize: "12px", marginTop: "8px", color: "#b00020" }}>
          Google login is not configured on server.
        </p>
      )}
    </div>
  );
}

export default GoogleLoginButton;