import * as chrono from "chrono-node";
import Event from "../models/Event.js";
import EmailProcessing from "../models/EmailProcessing.js";
import { getCalendarClient, getGmailClient } from "./googleClientService.js";
import { makeAgentDecision, formatExistingEventsForAgent } from "./agentDecisionService.js";

const EVENT_KEYWORDS = [
  "meeting",
  "call",
  "appointment",
  "schedule",
  "sync",
  "interview",
  "demo",
  "webinar",
  "conference",
  "event",
  "room",
  "discussion",
  "presentation",
];

const TASK_KEYWORDS = [
  "submit",
  "submission",
  "report",
  "deadline",
  "due",
  "deliver",
  "delivery",
  "complete",
  "finish",
  "eod",
  "end of day",
  "task",
];

const withDefaultDeadlineTime = (date, hour = 17, minute = 0) => {
  const normalized = new Date(date);
  normalized.setHours(hour, minute, 0, 0);
  return normalized;
};

const inferDeadlineDate = (text) => {
  const now = new Date();
  const parsedDate = chrono.parseDate(text, now, { forwardDate: true });

  if (parsedDate) {
    if (/\b(eod|end of day)\b/i.test(text)) {
      return withDefaultDeadlineTime(parsedDate, 17, 0);
    }
    return parsedDate;
  }

  if (/\b(eod|end of day)\b/i.test(text)) {
    if (/\btomorrow\b/i.test(text)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return withDefaultDeadlineTime(tomorrow, 17, 0);
    }

    return withDefaultDeadlineTime(now, 17, 0);
  }

  return null;
};

const decodeBase64Url = (value = "") => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
};

const extractBody = (payload) => {
  if (!payload) return "";

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  if (Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }

    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return "";
};

const getHeader = (headers = [], name) => {
  const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
  return header?.value || "";
};

const cleanSubject = (subject = "") =>
  subject.replace(/^(re|fwd?)\s*:\s*/i, "").trim();

const extractEventCandidate = ({ subject, body }) => {
  const text = `${subject}\n${body}`.trim();
  const lower = text.toLowerCase();

  const matchedEventKeywords = EVENT_KEYWORDS.filter((keyword) =>
    lower.includes(keyword)
  );

  const matchedTaskKeywords = TASK_KEYWORDS.filter((keyword) =>
    lower.includes(keyword)
  );

  const hasEventIntent =
    matchedEventKeywords.length > 0 ||
    /\bmeet|meeting|schedule|scheduled|call|appointment|room|presentation\b/i.test(text);

  const hasTaskIntent =
    matchedTaskKeywords.length > 0 ||
    /\bsubmit|submission|report|deadline|due\b/i.test(text);

  // Ensure low-confidence (generic dates without keywords) are tracked rather than fully dropped

  let cleanText = text.replace(/Time\s*:\s*(\d{1,2})\s*:\s*(\d{2})/gi, "Time: $1:$2");
  const parsedDate = hasTaskIntent
    ? inferDeadlineDate(cleanText)
    : chrono.parseDate(cleanText, new Date(), { forwardDate: true });

  if (!parsedDate) {
    return null;
  }

  // Robustly extract Time: if chrono missed it
  const timeMatch = text.match(/Time\s*:\s*(\d{1,2})\s*:\s*(\d{2})/i) || text.match(/Time\s*:\s*(?:at\s*)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      let mins = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      if (timeMatch[3]) {
          const ampm = timeMatch[3].toLowerCase();
          if (ampm === 'pm' && hours < 12) hours += 12;
          if (ampm === 'am' && hours === 12) hours = 0;
      }
      parsedDate.setHours(hours, mins, 0, 0); // Applies local dev timezone (IST) for exact display
  }

  // Robustly extract Location
  const locMatch = text.match(/Location\s*:\s*([^\n\r]+)/i);
  const location = locMatch ? locMatch[1].trim() : "";

  const title = cleanSubject(subject) ||
    (hasTaskIntent ? "Task deadline from email" : "Event detected from email");

  const matchedKeywords = [...matchedEventKeywords, ...matchedTaskKeywords];
  let confidence;
  if (!hasEventIntent && !hasTaskIntent) {
      confidence = 0.2;
  } else {
      const confidenceBase = hasTaskIntent ? 0.5 : 0.55;
      confidence = Math.min(confidenceBase + matchedKeywords.length * 0.08, 0.95);
  }

  return {
    title,
    description: body.slice(0, 1000),
    dateTime: parsedDate,
    location,
    confidence,
    entities: {
      keywords: matchedKeywords,
      intentType: hasTaskIntent ? "task" : "event",
    },
  };
};

export const createCalendarEvent = async ({ user, event }) => {
  const calendar = getCalendarClient({
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
  });

  const endDate = new Date(event.dateTime);
  endDate.setMinutes(endDate.getMinutes() + (event.duration || 60));

  const response = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.title,
      description: event.description,
      location: event.location,
      start: {
        dateTime: new Date(event.dateTime).toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
    },
  });

  return response.data.id;
};

export const processUserConnectedEmails = async (user) => {
  // Get allowed email senders (whitelist)
  const allowedSenders = (user.allowedEmailSenders || [])
    .filter((item) => item.isActive)
    .map((item) => item.email);

  const enforceWhitelist = user.emailPreferences?.enforceWhitelist ?? true;

  // Security: if whitelist enforcement is on and no allowed senders, reject all emails
  if (enforceWhitelist && allowedSenders.length === 0) {
    return {
      processed: 0,
      created: 0,
      scheduled: 0,
      pending: 0,
      skippedAlreadyProcessed: 0,
      skippedNonEvent: 0,
      skippedNotWhitelisted: 0,
      message: "No allowed email senders configured. Go to Email Config to add approved senders.",
      queryUsed: "none",
      usingEmailFilter: false,
      activeEmailsCount: 0,
    };
  }

  if (!user.googleAccessToken && !user.googleRefreshToken) {
    throw new Error(
      "Google credentials missing. Reconnect Google to enable Gmail processing."
    );
  }

  const existingEventsRaw = await Event.find({ userId: user._id, status: { $in: ["confirmed", "scheduled"] } });
  const existingEvents = formatExistingEventsForAgent(existingEventsRaw);
  
  const userHistoryRaw = await Event.find({ userId: user._id, attendanceStatus: { $in: ["attended", "not_attended"] } });
  const attendance_history = userHistoryRaw.map(e => ({ 
    title: e.title, 
    attendanceStatus: e.attendanceStatus,
    dateTime: e.dateTime ? e.dateTime.toISOString() : null,
    duration: e.duration,
    intentType: e.extractedData?.entities?.intentType
  }));

  const userPrefs = {
    ...((user.emailPreferences && typeof user.emailPreferences.toObject === 'function') 
      ? user.emailPreferences.toObject() 
      : (user.emailPreferences || {})),
    allowed_senders: allowedSenders,
    attendance_history: attendance_history
  };

  const gmail = getGmailClient({
    accessToken: user.googleAccessToken,
    refreshToken: user.googleRefreshToken,
  });

  // Build Gmail query with allowed senders
  const usingEmailFilter = allowedSenders.length > 0;
  const filteredQuery = `newer_than:7d (${allowedSenders
    .map((email) => `from:${email}`)
    .join(" OR ")})`;
  const query = usingEmailFilter ? filteredQuery : "newer_than:7d in:inbox";

  const listRes = await gmail.users.messages.list({
    userId: "me",
    q: query,
    maxResults: 20,
  });

  const messages = listRes.data.messages || [];

  let createdEvents = 0;
  let scheduledEvents = 0;
  let skippedNonEvent = 0;
  let skippedAlreadyProcessed = 0;
  let skippedNotWhitelisted = 0;

  for (const message of messages) {
    const existing = await EmailProcessing.findOne({
      gmailMessageId: message.id,
    });

    if (existing) {
      skippedAlreadyProcessed += 1;
      continue;
    }

    const messageRes = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full",
    });

    const payload = messageRes.data.payload || {};
    const headers = payload.headers || [];
    const subject = getHeader(headers, "Subject");
    const from = getHeader(headers, "From");
    const body = extractBody(payload);

    const processing = await EmailProcessing.create({
      userId: user._id,
      emailAddress: from,
      gmailMessageId: message.id,
      subject,
      from,
      body,
      receivedAt: messageRes.data.internalDate
        ? new Date(Number(messageRes.data.internalDate))
        : new Date(),
      processingStatus: "processing",
    });

    const candidate = extractEventCandidate({ subject, body });

    if (!candidate) {
      skippedNonEvent += 1;
      processing.isEventEmail = false;
      processing.eventConfidence = 0;
      processing.processingStatus = "completed";
      processing.processedAt = new Date();
      await processing.save();

      await gmail.users.messages.modify({
        userId: "me",
        id: message.id,
        requestBody: { removeLabelIds: ["UNREAD"] },
      });

      continue;
    }

    const nlpEvent = {
      date: candidate.dateTime.toISOString().split('T')[0],
      time: candidate.dateTime.toISOString().split('T')[1].substring(0,8),
      duration: 60,
      location: candidate.location || "",
      event_context: candidate.title,
      confidence: candidate.confidence,
      emailId: message.id,
      fromEmail: from,
    };

    let decision;
    try {
      decision = await makeAgentDecision(nlpEvent, existingEvents, userPrefs);
    } catch (e) {
      console.error("[AgentDecision Error]", e);
      decision = { action: "ERROR", event: nlpEvent };
    }

    let requiresUserConfirmation = false;
    let isConfirmed = true;
    let statusValue = "confirmed";

    if (decision.action === 'IGNORE' || decision.action === 'ERROR') {
       isConfirmed = false;
       statusValue = "ignored";
    } else if (decision.action === 'SUGGEST_SLOTS' || decision.action === 'NEEDS_REVIEW') {
       requiresUserConfirmation = true;
       isConfirmed = false;
       statusValue = "pending";
    }

    const shouldAutoSync = userPrefs.autoCalendarSync ?? false;
    
    if (decision.action === 'PREEMPT_EXISTING' && decision.conflicts && decision.conflicts.length > 0) {
      for (const conflict of decision.conflicts) {
         if (conflict.existing_id) {
            const existingEvent = await Event.findById(conflict.existing_id);
            if (existingEvent) {
               existingEvent.status = 'pending';
               existingEvent.isPreempted = true;
               existingEvent.requiresUserConfirmation = true;
               existingEvent.extractedData = {
                  ...(existingEvent.extractedData || {}),
                  suggestedSlots: decision.suggested_slots || []
               };
               
               // Manually sever Google Calendar connection so the event physically leaves the calendar while awaiting reschedule
               if (existingEvent.googleCalendarEventId && user.googleRefreshToken) {
                  try {
                     const calendar = getCalendarClient({
                        accessToken: user.googleAccessToken,
                        refreshToken: user.googleRefreshToken,
                     });
                     await calendar.events.delete({
                        calendarId: "primary",
                        eventId: existingEvent.googleCalendarEventId,
                     });
                     existingEvent.googleCalendarEventId = undefined; // Free the ID so a new one can spawn later
                  } catch (e) {
                     console.error("Agent failed to cleanly unschedule preempted event:", e);
                  }
               }
               
               existingEvent.markModified('extractedData');
               await existingEvent.save();
            }
         }
      }
    }

    if (decision.conflicts && decision.conflicts.some(c => c.type === 'BUFFER_VIOLATION')) {
      for (const conflict of decision.conflicts) {
         if (conflict.type === 'BUFFER_VIOLATION' && conflict.existing_id) {
            const existingEvent = await Event.findById(conflict.existing_id);
            if (existingEvent && !existingEvent.extractedData?.hasWarning) {
               existingEvent.extractedData = {
                  ...(existingEvent.extractedData || {}),
                  hasWarning: true // Explicitly propagate warning badge to the OLD existing event
               };
               // Mongoose requires explicitly marking Mixed types as modified
               existingEvent.markModified('extractedData');
               await existingEvent.save();
            }
         }
      }
    }

    const event = await Event.create({
      userId: user._id,
      title: decision.event?.title || candidate.title,
      description: candidate.description,
      location: candidate.location || "",
      dateTime: decision.event?.start ? new Date(decision.event.start) : candidate.dateTime,
      duration: 60,
      fromEmail: from,
      emailSubject: subject,
      emailId: message.id,
      confidence: decision.event?.confidence || candidate.confidence,
      priorityScore: decision.event?.priority_score || 0,
      requiresUserConfirmation,
      userConfirmed: isConfirmed,
      status: statusValue,
      extractedData: {
        originalText: `${subject}\n${body}`.slice(0, 3000),
        entities: candidate.entities,
        decisionAction: decision.action,
        decisionReason: decision.reason,
        suggestedSlots: decision.suggested_slots || [],
        hasWarning: decision.conflicts && decision.conflicts.some(c => c.type === 'BUFFER_VIOLATION'),
      },
    });

    createdEvents += 1;

    if (shouldAutoSync && isConfirmed) {
      try {
        const calendarEventId = await createCalendarEvent({ user, event });
        event.googleCalendarEventId = calendarEventId;
        event.status = "scheduled";
        await event.save();
        scheduledEvents += 1;
      } catch (error) {
        event.status = "confirmed";
        event.extractedData = {
          ...(event.extractedData || {}),
          calendarSyncError: error.message || "Calendar sync failed",
        };
        await event.save();
      }
    }

    processing.isEventEmail = true;
    processing.eventConfidence = candidate.confidence;
    processing.extractedEvent = event._id;
    processing.processingStatus = "completed";
    processing.processedAt = new Date();
    await processing.save();

    await gmail.users.messages.modify({
      userId: "me",
      id: message.id,
      requestBody: { removeLabelIds: ["UNREAD"] },
    });
  }

  return {
    query,
    queryUsed: query,
    usingEmailFilter,
    activeEmailsCount: allowedSenders.length,
    whitelistEnforced: enforceWhitelist,
    processedMessages: messages.length,
    processed: messages.length,
    created: createdEvents,
    createdEvents,
    scheduled: scheduledEvents,
    scheduledEvents,
    pending: Math.max(createdEvents - scheduledEvents, 0),
    pendingEvents: Math.max(createdEvents - scheduledEvents, 0),
    skippedNonEvent,
    skippedAlreadyProcessed,
    skippedNotWhitelisted,
  };
};
