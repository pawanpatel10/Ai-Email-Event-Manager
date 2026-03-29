import api from "./api";

export const signup = async (data) => {
  const res = await api.post("/auth/signup", data);
  return res.data;
};

export const verifyOtp = async (data) => {
  const res = await api.post("/auth/verify-otp", data);
  return res.data;
};

export const login = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

export const logoutApi = async () => {
  const res = await api.post("/auth/logout");
  return res.data;
};

export const forgotPassword = async (data) => {
  const res = await api.post("/auth/forgot-password", data);
  return res.data;
};

export const resetPassword = async (data) => {
  const res = await api.post("/auth/reset-password", data);
  return res.data;
};

export const googleLogin = async (tokenId) => {
  const res = await api.post("/auth/google", { tokenId });
  return res.data;
};

export const getGoogleClientConfig = async () => {
  const res = await api.get("/auth/google-config");
  return res.data;
};

export const saveGoogleToken = async (accessToken) => {
  const res = await api.post("/auth/google-token", { accessToken });
  return res.data;
};

export const saveGoogleAuthCode = async (code) => {
  const res = await api.post("/auth/google-code", { code });
  return res.data;
};

export const getGoogleTokenStatus = async () => {
  const res = await api.get("/auth/google-token-status");
  return res.data;
};

export const resendOtp = async (data) => {
  const res = await api.post("/auth/resend-otp", data);
  return res.data;
};

export const getUserInfo = async () => {
  const res = await api.get("/auth/me");
  return res.data;
};