import { google } from "googleapis";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
  "profile",
];

export const getOAuth2Client = (tokens = {}) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  client.setCredentials({
    access_token: tokens.accessToken || undefined,
    refresh_token: tokens.refreshToken || undefined,
  });

  return client;
};

export const getGmailClient = (tokens) => {
  const auth = getOAuth2Client(tokens);
  return google.gmail({ version: "v1", auth });
};

export const getCalendarClient = (tokens) => {
  const auth = getOAuth2Client(tokens);
  return google.calendar({ version: "v3", auth });
};

export const getGoogleScopes = () => GOOGLE_SCOPES.join(" ");
