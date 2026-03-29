import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  getEvents,
  getPendingEvents,
  getSchedulerStatus,
  confirmEvent,
  rejectEvent,
  deleteEvent,
  syncEventToCalendar,
} from "../services/eventService";
import "./Dashboard.css";

export default function Dashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    fetchEvents();
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshInterval = setInterval(() => {
      fetchEvents();
    }, 60000);

    return () => clearInterval(refreshInterval);
  }, [isAuthenticated]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError("");

      const [allEventsRes, pendingRes] = await Promise.all([
        getEvents(),
        getPendingEvents(),
      ]);

      const schedulerRes = await getSchedulerStatus();

      setEvents(allEventsRes.events || []);
      setPendingEvents(pendingRes.events || []);
      setSchedulerStatus(schedulerRes || null);
    } catch (err) {
      setError("Failed to load events");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmEvent = async (eventId) => {
    try {
      setError("");
      await confirmEvent(eventId);
      setSuccessMessage("Event confirmed successfully!");
      fetchEvents();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      if (err?.requiresConflictResolution) {
        await handleConflictResolution(eventId, err);
        return;
      }

      setError(err.message || "Failed to confirm event");
    }
  };

  const handleConflictResolution = async (eventId, conflictDetails) => {
    const conflictingEvents = conflictDetails?.conflictingEvents || [];

    const conflictLines = conflictingEvents
      .map((item, index) => {
        const start = formatDateTime(item.dateTime);
        const end = formatDateTime(item.endDateTime);
        return `${index + 1}. ${item.title} (${start} - ${end})`;
      })
      .join("\n");

    const shouldScheduleCurrent = window.confirm(
      `Conflict detected with existing events:\n\n${conflictLines}\n\nPress OK to schedule the current event and cancel conflicting event(s).\nPress Cancel to keep existing event(s) and cancel the current event.`
    );

    try {
      setError("");
      const resolution = shouldScheduleCurrent
        ? "schedule_current"
        : "keep_existing";

      const response = await confirmEvent(eventId, {
        conflictResolution: resolution,
      });

      setSuccessMessage(response?.message || "Conflict resolved successfully.");
      await fetchEvents();
      setTimeout(() => setSuccessMessage(""), 3500);
    } catch (resolutionError) {
      setError(
        resolutionError?.message || "Failed to resolve scheduling conflict"
      );
    }
  };

  const handleRejectEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to reject this event?")) {
      try {
        setError("");
        await rejectEvent(eventId);
        setSuccessMessage("Event rejected successfully!");
        fetchEvents();
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setError(err.message || "Failed to reject event");
      }
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        setError("");
        await deleteEvent(eventId);
        setSuccessMessage("Event deleted successfully!");
        fetchEvents();
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (err) {
        setError(err.message || "Failed to delete event");
      }
    }
  };

  const handleSyncEventToCalendar = async (eventId) => {
    try {
      setError("");
      const res = await syncEventToCalendar(eventId);
      setSuccessMessage(res.message || "Event synced to Google Calendar");
      await fetchEvents();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to sync event to Google Calendar");
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "No time";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return "high";
    if (confidence >= 0.5) return "medium";
    return "low";
  };

  const formatDateTime = (value) => {
    if (!value) return "Not available";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Not available";
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="dashboard-container">Loading your events...</div>;
  }

  const displayEvents =
    activeTab === "pending"
      ? pendingEvents
      : activeTab === "all"
      ? events
      : events.filter((e) => e.status === activeTab);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Event Dashboard</h1>
        <p>Manage your scheduled events and pending confirmations</p>
      </div>

      {schedulerStatus && (
        <div className="scheduler-status-card">
          <div className="scheduler-status-row">
            <span className="scheduler-label">Automatic Scheduling:</span>
            <span
              className={`scheduler-value ${schedulerStatus.schedulerEnabled ? "enabled" : "disabled"}`}
            >
              {schedulerStatus.schedulerEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>
          <div className="scheduler-status-row">
            <span className="scheduler-label">Interval:</span>
            <span className="scheduler-value">Every {schedulerStatus.intervalMinutes || 5} minute(s)</span>
          </div>
          <div className="scheduler-status-row">
            <span className="scheduler-label">Last Scheduler Run:</span>
            <span className="scheduler-value">{formatDateTime(schedulerStatus.status?.lastRunAt)}</span>
          </div>
          <div className="scheduler-status-row">
            <span className="scheduler-label">Last Email Processed:</span>
            <span className="scheduler-value">{formatDateTime(schedulerStatus.status?.lastProcessedAt)}</span>
          </div>
          <div className="scheduler-status-row wrap">
            <span className="scheduler-label">Last Result:</span>
            <span className="scheduler-value">
              processed {schedulerStatus.status?.lastResult?.processedMessages || 0}, created {schedulerStatus.status?.lastResult?.createdEvents || 0}, scheduled {schedulerStatus.status?.lastResult?.scheduledEvents || 0}
            </span>
          </div>
          {schedulerStatus.status?.lastError && (
            <div className="scheduler-status-row wrap error">
              <span className="scheduler-label">Last Error:</span>
              <span className="scheduler-value">{schedulerStatus.status.lastError}</span>
            </div>
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && (
        <div className="alert alert-success">{successMessage}</div>
      )}

      <div className="dashboard-content">
        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending ({pendingEvents.length})
          </button>
          <button
            className={`tab ${activeTab === "scheduled" ? "active" : ""}`}
            onClick={() => setActiveTab("scheduled")}
          >
            Scheduled
          </button>
          <button
            className={`tab ${activeTab === "confirmed" ? "active" : ""}`}
            onClick={() => setActiveTab("confirmed")}
          >
            Confirmed
          </button>
          <button
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All Events
          </button>
        </div>

        {/* Events List */}
        <div className="events-container">
          {displayEvents.length === 0 ? (
            <div className="empty-state">
              <p>
                {activeTab === "pending"
                  ? "No pending events. You're all caught up!"
                  : "No events found in this category."}
              </p>
            </div>
          ) : (
            <div className="events-grid">
              {displayEvents.map((event) => (
                <div key={event._id} className="event-card">
                  <div className="event-header">
                    <h3>{event.title}</h3>
                    <span className={`status-badge ${event.status}`}>
                      {event.status}
                    </span>
                  </div>

                  <div className="event-body">
                    <div className="event-detail">
                      <span className="label">Date & Time:</span>
                      <span className="value">
                        {formatDate(event.dateTime)} at{" "}
                        {formatTime(event.dateTime)}
                      </span>
                    </div>

                    {event.location && (
                      <div className="event-detail">
                        <span className="label">Location:</span>
                        <span className="value">{event.location}</span>
                      </div>
                    )}

                    {event.duration && (
                      <div className="event-detail">
                        <span className="label">Duration:</span>
                        <span className="value">{event.duration} minutes</span>
                      </div>
                    )}

                    {event.description && (
                      <div className="event-detail">
                        <span className="label">Description:</span>
                        <span className="value">{event.description}</span>
                      </div>
                    )}

                    {event.fromEmail && (
                      <div className="event-detail">
                        <span className="label">From:</span>
                        <span className="value">{event.fromEmail}</span>
                      </div>
                    )}

                    {event.confidence && (
                      <div className="event-detail">
                        <span className="label">Confidence:</span>
                        <span
                          className={`confidence ${getConfidenceColor(
                            event.confidence
                          )}`}
                        >
                          {Math.round(event.confidence * 100)}%
                        </span>
                      </div>
                    )}

                    <div className="event-detail">
                      <span className="label">Calendar:</span>
                      <span className="value">
                        {event.googleCalendarEventId ? "Synced" : "Not synced"}
                      </span>
                    </div>
                  </div>

                  <div className="event-actions">
                    {event.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleConfirmEvent(event._id)}
                          className="btn btn-confirm"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleRejectEvent(event._id)}
                          className="btn btn-reject"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {event.status !== "pending" && (
                      <>
                        {!event.googleCalendarEventId && event.status !== "cancelled" && (
                          <button
                            onClick={() => handleSyncEventToCalendar(event._id)}
                            className="btn btn-sync"
                          >
                            Sync to Calendar
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteEvent(event._id)}
                          className="btn btn-delete"
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
