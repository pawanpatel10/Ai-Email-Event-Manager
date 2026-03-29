import { createContext, useContext, useState, useEffect, useCallback } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [accessToken, setAccessToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Handle automatic logout on session expiry
  const handleSessionExpired = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setSessionExpired(true);
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");
    
    if (token) {
      setAccessToken(token);
      if (userData) {
        try {
          setUser(JSON.parse(userData));
        } catch (e) {
          console.error("Failed to parse user data:", e);
        }
      }
    }
    setLoading(false);

    // Listen for session expiration event from API interceptor
    window.addEventListener("sessionExpired", handleSessionExpired);

    return () => {
      window.removeEventListener("sessionExpired", handleSessionExpired);
    };
  }, [handleSessionExpired]);

  const login = (token, userData = null) => {
    localStorage.setItem("accessToken", token);
    setAccessToken(token);
    
    if (userData) {
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    }
    
    setSessionExpired(false);
  };

  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    setAccessToken(null);
    setUser(null);
    setSessionExpired(false);
  };

  const clearSessionExpiredFlag = () => {
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{
        accessToken,
        user,
        isAuthenticated: !!accessToken,
        login,
        logout,
        loading,
        sessionExpired,
        clearSessionExpiredFlag,
        handleSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
