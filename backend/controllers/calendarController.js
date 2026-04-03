import asyncHandler from "../middlewares/asyncHandler.js";
import User from "../models/User.js";
import Event from "../models/Event.js";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

const getGoogleClient = () => {
  return new OAuth2Client(
    process.env.GOOGLE_LOGIN_CLIENT_ID,
    process.env.GOOGLE_LOGIN_CLIENT_SECRET,
    "postmessage"
  );
};

export const linkCalendar = asyncHandler(async (req, res) => {
  const { code } = req.body;

  if (!code) {
    res.status(400);
    throw new Error("Authorization code is required");
  }

  const client = getGoogleClient();
  const { tokens } = await client.getToken(code);

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (tokens.refresh_token) {
    user.googleRefreshToken = tokens.refresh_token;
    user.isCalendarLinked = true;
    await user.save();
  } else if (!user.googleRefreshToken) {
    
    res.status(400);
    throw new Error(
      "No refresh token provided by Google. You may need to revoke access in your Google Account and try again."
    );
  }

  res.json({
    success: true,
    message: "Calendar linked successfully",
  });
});

export const unlinkCalendar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.googleRefreshToken = null;
  user.isCalendarLinked = false;
  await user.save();

  res.json({
    success: true,
    message: "Calendar unlinked successfully",
  });
});

export const getCalendarEvents = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || !user.isCalendarLinked || !user.googleRefreshToken) {
    res.status(400);
    throw new Error("Google Calendar is not linked");
  }

  const client = getGoogleClient();
  client.setCredentials({ refresh_token: user.googleRefreshToken });

  const calendar = google.calendar({ version: "v3", auth: client });

  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  const response = await calendar.events.list({
    calendarId: "primary",
    timeMin: oneMonthAgo.toISOString(),
    maxResults: 250,
    singleEvents: true,
    orderBy: "startTime",
  });

  res.json({
    success: true,
    events: response.data.items,
  });
});

export const addEvent = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || !user.isCalendarLinked || !user.googleRefreshToken) {
    res.status(400);
    throw new Error("Google Calendar is not linked");
  }

  const { title, start, end } = req.body;

  if (!title || !start || !end) {
    res.status(400);
    throw new Error("Title, start date, and end date are required");
  }

  const client = getGoogleClient();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: "v3", auth: client });

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: title,
      start: { dateTime: new Date(start).toISOString() },
      end: { dateTime: new Date(end).toISOString() },
    },
  });

  await Event.create({
    userId: user._id,
    title,
    dateTime: new Date(start),
    endDateTime: new Date(end),
    fromEmail: "manual@dashboard",
    googleCalendarEventId: response.data.id,
    status: "confirmed",
    confidence: 1,
    requiresUserConfirmation: false,
    userConfirmed: true,
    confirmedAt: new Date(),
  });

  res.json({ success: true, event: response.data });
});

export const updateEvent = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || !user.isCalendarLinked || !user.googleRefreshToken) {
    res.status(400);
    throw new Error("Google Calendar is not linked");
  }

  const { id } = req.params;
  const { title, start, end } = req.body;

  const client = getGoogleClient();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: "v3", auth: client });

  const event = await calendar.events.get({ calendarId: 'primary', eventId: id });

  const response = await calendar.events.update({
    calendarId: 'primary',
    eventId: id,
    requestBody: {
      ...event.data,
      summary: title || event.data.summary,
      start: start ? { dateTime: new Date(start).toISOString() } : event.data.start,
      end: end ? { dateTime: new Date(end).toISOString() } : event.data.end,
    },
  });

  const evt = await Event.findOne({ googleCalendarEventId: id });
  if (evt) {
    evt.title = title || evt.title;
    if (start) evt.dateTime = new Date(start);
    if (end) evt.endDateTime = new Date(end);
    await evt.save();
  }

  res.json({ success: true, event: response.data });
});

export const deleteEvent = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);

  if (!user || !user.isCalendarLinked || !user.googleRefreshToken) {
    res.status(400);
    throw new Error("Google Calendar is not linked");
  }

  const { id } = req.params;

  const client = getGoogleClient();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  const calendar = google.calendar({ version: "v3", auth: client });

  await calendar.events.delete({
    calendarId: 'primary',
    eventId: id,
  });

  await Event.deleteOne({ googleCalendarEventId: id });

  res.json({ success: true, message: "Event deleted successfully" });
});
