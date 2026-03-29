import Event from "../models/Event.js";
import asyncHandler from "../middlewares/asyncHandler.js";
import User from "../models/User.js";
import { getCalendarClient } from "../services/googleClientService.js";
import {
  createCalendarEvent,
  processUserConnectedEmails,
} from "../services/emailProcessingService.js";

const DEFAULT_EVENT_DURATION_MINUTES = 60;

const toEventRange = (event) => {
  const start = new Date(event?.dateTime);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const explicitEnd = event?.endDateTime ? new Date(event.endDateTime) : null;
  const hasExplicitEnd = explicitEnd && !Number.isNaN(explicitEnd.getTime());

  if (hasExplicitEnd && explicitEnd > start) {
    return { start, end: explicitEnd };
  }

  const parsedDuration = Number.parseInt(event?.duration, 10);
  const durationMinutes =
    Number.isFinite(parsedDuration) && parsedDuration > 0
      ? parsedDuration
      : DEFAULT_EVENT_DURATION_MINUTES;

  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
};

const rangesOverlap = (left, right) => {
  if (!left || !right) {
    return false;
  }

  return left.start < right.end && right.start < left.end;
};

const findConflictingEvents = async (event) => {
  const targetRange = toEventRange(event);
  if (!targetRange) {
    return [];
  }

  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const possibleConflicts = await Event.find({
    userId: event.userId,
    _id: { $ne: event._id },
    status: { $in: ["confirmed", "scheduled"] },
    dateTime: {
      $lt: targetRange.end,
      $gte: new Date(targetRange.start.getTime() - twentyFourHoursMs),
    },
  }).sort({ dateTime: 1 });

  return possibleConflicts.filter((candidate) => {
    const candidateRange = toEventRange(candidate);
    return rangesOverlap(targetRange, candidateRange);
  });
};

const formatConflictPayload = (event) => {
  const range = toEventRange(event);
  return {
    id: event._id,
    title: event.title,
    status: event.status,
    dateTime: event.dateTime,
    endDateTime: range?.end || null,
    duration: event.duration || DEFAULT_EVENT_DURATION_MINUTES,
    location: event.location || "",
  };
};

const cancelConflictingEvents = async ({ user, selectedEventId, conflicts }) => {
  let calendarCleanupWarning = null;
  const now = new Date();

  for (const conflict of conflicts) {
    if (conflict.googleCalendarEventId && user?.googleAccessToken) {
      try {
        const calendar = getCalendarClient({
          accessToken: user.googleAccessToken,
          refreshToken: user.googleRefreshToken,
        });

        await calendar.events.delete({
          calendarId: "primary",
          eventId: conflict.googleCalendarEventId,
        });
      } catch (_error) {
        calendarCleanupWarning =
          "One or more previously scheduled conflicting calendar events could not be removed automatically.";
      }
    }

    conflict.status = "cancelled";
    conflict.userConfirmed = false;
    conflict.confirmedAt = null;
    conflict.googleCalendarEventId = undefined;
    conflict.extractedData = {
      ...(conflict.extractedData || {}),
      conflictResolution: {
        action: "cancelled_due_to_overlap",
        selectedEventId,
        resolvedAt: now,
      },
    };

    await conflict.save();
  }

  return { calendarCleanupWarning };
};

// @desc    Get all events for a user
// @route   GET /api/events
// @access  Private
export const getUserEvents = asyncHandler(async (req, res) => {
  const { status } = req.query;

  let filter = { userId: req.user.id };
  if (status) {
    filter.status = status;
  }

  const events = await Event.find(filter).sort({ dateTime: 1 });

  res.status(200).json({
    success: true,
    count: events.length,
    events,
  });
});

// @desc    Get event by ID
// @route   GET /api/events/:id
// @access  Private
export const getEventById = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if user owns this event
  if (event.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to view this event",
    });
  }

  res.status(200).json({
    success: true,
    event,
  });
});

// @desc    Confirm/update event
// @route   PATCH /api/events/:id/confirm
// @access  Private
export const confirmEvent = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if user owns this event
  if (event.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to update this event",
    });
  }

  // Validate request body for optional updates
  const {
    title,
    description,
    dateTime,
    location,
    duration,
    endDateTime,
    conflictResolution,
  } = req.body;

  if (title) event.title = title;
  if (description) event.description = description;
  if (dateTime) event.dateTime = dateTime;
  if (location) event.location = location;
  if (duration) event.duration = duration;
  if (endDateTime) event.endDateTime = endDateTime;

  const user = await User.findById(req.user.id);
  const conflicts = await findConflictingEvents(event);

  if (conflicts.length > 0) {
    if (
      conflictResolution !== "schedule_current" &&
      conflictResolution !== "keep_existing"
    ) {
      return res.status(409).json({
        success: false,
        requiresConflictResolution: true,
        message:
          "This event overlaps with existing scheduled events. Choose which one to keep.",
        currentEvent: formatConflictPayload(event),
        conflictingEvents: conflicts.map(formatConflictPayload),
        conflictOptions: ["schedule_current", "keep_existing"],
      });
    }

    if (conflictResolution === "keep_existing") {
      event.status = "cancelled";
      event.userConfirmed = false;
      event.confirmedAt = null;
      event.extractedData = {
        ...(event.extractedData || {}),
        conflictResolution: {
          action: "kept_existing_events",
          resolvedAt: new Date(),
          conflictingEventIds: conflicts.map((item) => item._id),
        },
      };

      event = await event.save();

      return res.status(200).json({
        success: true,
        message:
          "Existing overlapping event(s) were kept. Current event was cancelled.",
        event,
      });
    }
  }

  event.userConfirmed = true;
  event.confirmedAt = new Date();
  event.status = "confirmed";

  const shouldAutoSync = user?.emailPreferences?.autoCalendarSync;

  let calendarSyncWarning = null;

  if (conflicts.length > 0 && conflictResolution === "schedule_current") {
    const { calendarCleanupWarning } = await cancelConflictingEvents({
      user,
      selectedEventId: event._id,
      conflicts,
    });

    if (calendarCleanupWarning) {
      calendarSyncWarning = calendarCleanupWarning;
    }
  }

  if (shouldAutoSync && user?.googleAccessToken) {
    try {
      const calendarEventId = await createCalendarEvent({ user, event });
      event.googleCalendarEventId = calendarEventId;
      event.status = "scheduled";
    } catch (error) {
      // Preserve confirmation even if calendar sync fails.
      event.status = "confirmed";
      event.extractedData = {
        ...(event.extractedData || {}),
        calendarSyncError: error.message || "Calendar sync failed",
      };
      calendarSyncWarning =
        error.message ||
        "Event confirmed but Google Calendar sync failed. Reconnect Google and try again.";
    }
  } else if (shouldAutoSync && !user?.googleAccessToken) {
    calendarSyncWarning =
      "Event confirmed, but Google is not connected for calendar sync.";
  }

  event = await event.save();

  res.status(200).json({
    success: true,
    message: calendarSyncWarning
      ? "Event confirmed with sync warning"
      : "Event confirmed",
    event,
    calendarSyncWarning,
  });
});

// @desc    Reject/cancel event
// @route   PATCH /api/events/:id/reject
// @access  Private
export const rejectEvent = asyncHandler(async (req, res) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if user owns this event
  if (event.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to reject this event",
    });
  }

  event.status = "cancelled";
  event.userConfirmed = false;

  event = await event.save();

  res.status(200).json({
    success: true,
    message: "Event rejected",
    event,
  });
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
export const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  // Check if user owns this event
  if (event.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to delete this event",
    });
  }

  await Event.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Event deleted successfully",
  });
});

// @desc    Manually sync an event to Google Calendar
// @route   POST /api/events/:id/sync-calendar
// @access  Private
export const syncEventToCalendar = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return res.status(404).json({
      success: false,
      message: "Event not found",
    });
  }

  if (event.userId.toString() !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: "Not authorized to sync this event",
    });
  }

  if (event.googleCalendarEventId) {
    return res.status(200).json({
      success: true,
      message: "Event is already synced to Google Calendar",
      event,
    });
  }

  const user = await User.findById(req.user.id);
  if (!user?.googleAccessToken) {
    return res.status(400).json({
      success: false,
      message:
        "Google Calendar is not connected. Connect Google services first.",
    });
  }

  try {
    const calendarEventId = await createCalendarEvent({ user, event });
    event.googleCalendarEventId = calendarEventId;
    event.status = "scheduled";
    await event.save();

    return res.status(200).json({
      success: true,
      message: "Event synced to Google Calendar successfully",
      event,
    });
  } catch (error) {
    event.extractedData = {
      ...(event.extractedData || {}),
      calendarSyncError: error.message || "Calendar sync failed",
    };
    await event.save();

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to sync event to Google Calendar",
    });
  }
});

// @desc    Get pending events (requiring confirmation)
// @route   GET /api/events/pending/list
// @access  Private
export const getPendingEvents = asyncHandler(async (req, res) => {
  const events = await Event.find({
    userId: req.user.id,
    requiresUserConfirmation: true,
    userConfirmed: false,
    status: "pending",
  }).sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: events.length,
    events,
  });
});

// @desc    Process unread connected emails for current user
// @route   POST /api/events/process-emails
// @access  Private
export const processEmailsNow = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  try {
    const result = await processUserConnectedEmails(user);

    res.status(200).json({
      success: true,
      message: "Email processing completed",
      ...result,
    });
  } catch (error) {
    res.status(400);
    throw new Error(error.message || "Failed to process emails");
  }
});

// @desc    Get scheduler status for current user
// @route   GET /api/events/scheduler-status
// @access  Private
export const getSchedulerStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select(
    "emailPreferences.schedulerEnabled schedulerStatus"
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  const intervalMinutes = Number.parseInt(
    process.env.EMAIL_PROCESSING_INTERVAL_MINUTES || "5",
    10
  );

  res.status(200).json({
    success: true,
    schedulerEnabled: user.emailPreferences?.schedulerEnabled ?? true,
    intervalMinutes: Number.isFinite(intervalMinutes) && intervalMinutes > 0 ? intervalMinutes : 5,
    status: user.schedulerStatus || {},
  });
});
