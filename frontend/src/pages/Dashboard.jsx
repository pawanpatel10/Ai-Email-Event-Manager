import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { logoutApi } from "../services/authService";
import { linkCalendar, getCalendarEvents, unlinkCalendar, addCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "../services/calendarService";
import {
  getEvents,
  getPendingEvents,
  getSchedulerStatus,
  confirmEvent,
  rejectEvent,
  deleteEvent,
  syncEventToCalendar,
  markAttendance,
} from "../services/eventService";
import {
  getEmailPreferences,
  updateEmailPreferences,
  getAllowedEmailSenders,
  addAllowedEmailSender,
  removeAllowedEmailSender,
  toggleAllowedEmailSender,
  updateWhitelistEnforcement,
} from "../services/emailService";
import api from "../services/api";
import ProfilePopup from "../components/ProfilePopup";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import "./Dashboard.css";
import "./EmailConfig.css";

const localizer = momentLocalizer(moment);

function Home() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("Home");
  const [user, setUser] = useState(null);
  
  // Calendar state
  const [events, setEvents] = useState([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [eventForm, setEventForm] = useState({ title: '', start: '', end: '' });

  // Home state
  const [aiEvents, setAiEvents] = useState([]);
  const [pendingAiEvents, setPendingAiEvents] = useState([]);
  const [loadingAiEvents, setLoadingAiEvents] = useState(true);
  const [aiEventsError, setAiEventsError] = useState("");
  const [aiSuccessMessage, setAiSuccessMessage] = useState("");
  const [eventsTab, setEventsTab] = useState("all");
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  // Email Config state
  const [allowedSenders, setAllowedSenders] = useState([]);
  const [enforceWhitelist, setEnforceWhitelist] = useState(true);
  const [newAllowedEmail, setNewAllowedEmail] = useState("");
  const [newAllowedDisplayName, setNewAllowedDisplayName] = useState("");
  const [preferences, setPreferences] = useState({
    schedulerEnabled: true,
    autoSchedule: false,
    requireConfirmation: true,
    autoCalendarSync: true,
    eventKeywords: [],
  });
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);
  const [emailConfigError, setEmailConfigError] = useState("");
  const [emailConfigSuccess, setEmailConfigSuccess] = useState("");
  const activeSendersCount = allowedSenders.filter((sender) => sender.isActive).length;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await api.get("/auth/me");
        setUser(res.data.user);
      } catch (err) {
        console.error("Failed to fetch user", err);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (activeTab === 'Calendar' && user?.isCalendarLinked) {
      const fetchEvents = async () => {
        try {
          setLoadingCalendar(true);
          const res = await getCalendarEvents();
          setEvents(res.events || []);
        } catch (err) {
          console.error("Failed to fetch events", err);
        } finally {
          setLoadingCalendar(false);
        }
      };
      fetchEvents();
    }
  }, [activeTab, user?.isCalendarLinked]);

  useEffect(() => {
    if (!user) return;
    fetchAiEvents();
    const refreshInterval = setInterval(() => {
      fetchAiEvents();
    }, 60000);
    return () => clearInterval(refreshInterval);
  }, [user]);

  useEffect(() => {
    if (activeTab === 'EmailConfig') {
      const fetchEmailConfig = async () => {
        try {
          setEmailConfigLoading(true);
          const prefsRes = await getEmailPreferences();
          setPreferences(prefsRes.preferences || preferences);

          const whitelistRes = await getAllowedEmailSenders();
          setAllowedSenders(whitelistRes.allowedSenders || []);
          setEnforceWhitelist(whitelistRes.enforceWhitelist ?? true);
        } catch (err) {
          setEmailConfigError("Failed to load email configuration");
          console.error(err);
        } finally {
          setEmailConfigLoading(false);
        }
      };
      fetchEmailConfig();
    }
  }, [activeTab]);

  const fetchAiEvents = async () => {
    try {
      setLoadingAiEvents(true);
      setAiEventsError("");
      const [allEventsResult, pendingResult, schedulerResult] = await Promise.allSettled([
        getEvents(),
        getPendingEvents(),
        getSchedulerStatus(),
      ]);

      if (allEventsResult.status === "fulfilled") setAiEvents(allEventsResult.value?.events || []);
      if (pendingResult.status === "fulfilled") setPendingAiEvents(pendingResult.value?.events || []);
      if (schedulerResult.status === "fulfilled") setSchedulerStatus(schedulerResult.value || null);
    } catch (err) {
      setAiEventsError(err?.message || "Failed to load events");
      console.error(err);
    } finally {
      setLoadingAiEvents(false);
    }
  };

  const handleProcessEmailsNow = async () => {
    try {
      setLoadingAiEvents(true);
      setAiEventsError("");
      const res = await api.post("/events/process-emails");
      setAiSuccessMessage(`Emails processed! Found ${res.data.processedMessages} messages.`);
      await fetchAiEvents();
      setTimeout(() => setAiSuccessMessage(""), 4000);
    } catch (err) {
      setAiEventsError(err.response?.data?.message || err.message || "Failed to process emails. Are you connected?");
    } finally {
      setLoadingAiEvents(false);
    }
  };

  const handleConfirmAiEvent = async (eventId, slot = null) => {
    try { 
      setAiEventsError(""); 
      const updates = slot ? { 
        dateTime: slot.start, 
        endDateTime: slot.end,
        conflictResolution: "schedule_current" 
      } : {
        conflictResolution: "schedule_current"
      };
      await confirmEvent(eventId, updates); 
      setAiSuccessMessage("Event confirmed!"); 
      fetchAiEvents(); 
      setTimeout(() => setAiSuccessMessage(""), 3000); 
    }
    catch (err) { 
      if (err.requiresConflictResolution) {
        setAiEventsError("Conflict detected. Please choose a different slot or resolve manually.");
      } else {
        setAiEventsError(err.message || "Failed to confirm event"); 
      }
    }
  };

  const handleRejectAiEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to reject this event?")) {
      try { setAiEventsError(""); await rejectEvent(eventId); setAiSuccessMessage("Event rejected!"); fetchAiEvents(); setTimeout(() => setAiSuccessMessage(""), 3000); }
      catch (err) { setAiEventsError(err.message || "Failed to reject event"); }
    }
  };

  const handleDeleteAiEvent = async (eventId) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try { setAiEventsError(""); await deleteEvent(eventId); setAiSuccessMessage("Event deleted!"); fetchAiEvents(); setTimeout(() => setAiSuccessMessage(""), 3000); }
      catch (err) { setAiEventsError(err.message || "Failed to delete event"); }
    }
  };

  const handleSyncAiEvent = async (eventId) => {
    try { setAiEventsError(""); await syncEventToCalendar(eventId); setAiSuccessMessage("Event synced to Google Calendar!"); fetchAiEvents(); setTimeout(() => setAiSuccessMessage(""), 3000); }
    catch (err) { setAiEventsError(err.message || "Failed to sync event"); }
  };

  const handleAttendance = async (eventId, status) => {
    try {
      setAiEventsError("");
      await markAttendance(eventId, status);
      setAiSuccessMessage(`Event marked as ${status.replace('_', ' ')}!`);
      fetchAiEvents();
      setTimeout(() => setAiSuccessMessage(""), 3000);
    } catch (err) {
      setAiEventsError(err.message || "Failed to update attendance");
    }
  };

  const handleAddAllowedSender = async (e) => {
    e.preventDefault();
    if (!newAllowedEmail.trim()) { setEmailConfigError("Please enter an email address"); return; }
    try { setEmailConfigError(""); const res = await addAllowedEmailSender(newAllowedEmail, newAllowedDisplayName); setAllowedSenders(res.allowedSenders || []); setNewAllowedEmail(""); setNewAllowedDisplayName(""); setEmailConfigSuccess("Email sender added to whitelist!"); setTimeout(() => setEmailConfigSuccess(""), 3000); } catch (err) { setEmailConfigError(err.message || "Failed to add email to whitelist"); }
  };

  const handleRemoveAllowedSender = async (email) => {
    if (window.confirm("Are you sure you want to remove this sender from the whitelist?")) {
      try { setEmailConfigError(""); const res = await removeAllowedEmailSender(email); setAllowedSenders(res.allowedSenders || []); setEmailConfigSuccess("Email sender removed from whitelist!"); setTimeout(() => setEmailConfigSuccess(""), 3000); } catch (err) { setEmailConfigError(err.message || "Failed to remove sender from whitelist"); }
    }
  };

  const handleToggleAllowedSender = async (email) => {
    try { setEmailConfigError(""); const res = await toggleAllowedEmailSender(email); setAllowedSenders(res.allowedSenders || []); } catch (err) { setEmailConfigError(err.message || "Failed to toggle sender status"); }
  };

  const handleToggleWhitelist = async () => {
    try { setEmailConfigError(""); const res = await updateWhitelistEnforcement(!enforceWhitelist); setEnforceWhitelist(!enforceWhitelist); setEmailConfigSuccess(`Whitelist enforcement ${!enforceWhitelist ? "enabled" : "disabled"}!`); setTimeout(() => setEmailConfigSuccess(""), 3000); } catch (err) { setEmailConfigError(err.message || "Failed to update whitelist enforcement"); }
  };

  const handlePreferenceChange = (key, value) => { setPreferences({ ...preferences, [key]: value, }); };

  const handleSavePreferences = async () => {
    try { setEmailConfigError(""); await updateEmailPreferences(preferences); setEmailConfigSuccess("Preferences saved successfully!"); setTimeout(() => setEmailConfigSuccess(""), 3000); } catch (err) { setEmailConfigError(err.message || "Failed to save preferences"); }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "No date";
    return new Date(dateString).toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };
  const formatTime = (dateString) => {
    if (!dateString) return "No time";
    return new Date(dateString).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };
  const getEventEndTime = (event) => {
    const fallbackStart = new Date(event.dateTime);
    if (event.endDateTime) {
      const parsedEnd = new Date(event.endDateTime);
      if (!Number.isNaN(parsedEnd.getTime())) return parsedEnd;
    }
    if (!Number.isNaN(fallbackStart.getTime()) && Number(event.duration) > 0) return new Date(fallbackStart.getTime() + Number(event.duration) * 60000);
    return fallbackStart;
  };

  const displayAiEvents = eventsTab === "pending" ? pendingAiEvents : eventsTab === "all" ? aiEvents : aiEvents.filter(e => e.status === eventsTab);
  const now = new Date();
  const futureAiEvents = displayAiEvents.filter((e) => { const end = getEventEndTime(e); return !Number.isNaN(end.getTime()) && end >= now; });
  const pastAiEvents = displayAiEvents.filter((e) => { const end = getEventEndTime(e); return !Number.isNaN(end.getTime()) && end < now; });

  const renderEventsGrid = (items, isPast) => (
    <div className="events-grid">
      {items.map((event) => (
        <div key={event._id} className={`event-card ${event.isPreempted ? 'preempted' : ''}`}>
          <div className="event-header">
            <h3>{event.title}</h3>
            <div>
              <span className={`status-badge ${event.status}`}>{event.status}</span>
              {event.isPreempted && <span className="status-badge preempted" style={{marginLeft: '0.5rem', backgroundColor: '#e2e8f0', color: '#64748b'}}>Preempted</span>}
              {event.priorityScore > 0 && <span className="status-badge priority" style={{marginLeft: '0.5rem', backgroundColor: '#1e293b', color: '#f8fafc'}}>Priority: {event.priorityScore.toFixed(0)}</span>}
            </div>
          </div>
          <div className="event-body">
            {event.extractedData?.hasWarning && (
              <div style={{color: '#b45309', backgroundColor: '#fef3c7', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                ⚠️ Soft conflict warning: This event violates your calendar buffer.
              </div>
            )}
            <div className="event-detail"><span className="label">Date &amp; Time:</span><span className="value">{formatDate(event.dateTime)} at {formatTime(event.dateTime)}</span></div>
            {event.location && <div className="event-detail"><span className="label">Location:</span><span className="value">{event.location}</span></div>}
            {event.duration && <div className="event-detail"><span className="label">Duration:</span><span className="value">{event.duration} mins</span></div>}
            {event.fromEmail && <div className="event-detail"><span className="label">From:</span><span className="value">{event.fromEmail}</span></div>}
            {isPast && (
              <div className="event-detail">
                <span className="label">Attendance:</span>
                <span className="value">
                  {event.attendanceStatus === 'pending' ? 'Not recorded' : event.attendanceStatus.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
          <div className="event-actions">
            {isPast ? (
              event.attendanceStatus === 'pending' && (
                 <>
                  <button onClick={() => handleAttendance(event._id, 'attended')} className="btn btn-sync">Attended</button>
                  <button onClick={() => handleAttendance(event._id, 'not_attended')} className="btn btn-reject">Not Attended</button>
                 </>
              )
            ) : (
              <>
                {event.status === "pending" && (
                  <>
                    <button onClick={() => handleConfirmAiEvent(event._id)} className="btn btn-confirm">Confirm (Original Time)</button>
                    <button onClick={() => handleRejectAiEvent(event._id)} className="btn btn-reject">Reject</button>
                    {event.extractedData?.suggestedSlots?.length > 0 && (
                      <div className="suggested-slots" style={{ marginTop: '10px', width: '100%' }}>
                        <h4 style={{ fontSize: '13px', marginBottom: '8px', color: '#475569' }}>Suggested Slots:</h4>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {event.extractedData.suggestedSlots.map((slot, idx) => (
                            <button 
                              key={idx}
                              onClick={() => handleConfirmAiEvent(event._id, slot)} 
                              style={{ padding: '6px 12px', backgroundColor: '#e2e8f0', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', color: '#334155' }}
                            >
                              {slot.label || `${formatTime(slot.start)} - ${formatTime(slot.end)}`}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
                {event.status !== "pending" && (
                  <>
                    {!event.googleCalendarEventId && event.status !== "cancelled" && (
                      <button onClick={() => handleSyncAiEvent(event._id)} className="btn btn-sync">Sync</button>
                    )}
                    <button onClick={() => handleDeleteAiEvent(event._id)} className="btn btn-delete">Delete</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const handleLinkCalendar = () => {
    const client = window.google.accounts.oauth2.initCodeClient({
      client_id: import.meta.env.VITE_GOOGLE_LOGIN_CLIENT_ID || "298955419528-blgq3tumq42cpqtjcjjsqgo0npsfqf4k.apps.googleusercontent.com",
      scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly",
      ux_mode: "popup",
      callback: async (response) => {
        try {
          if (response.code) {
            await linkCalendar(response.code);
            setUser({ ...user, isCalendarLinked: true });
            alert("Calendar linked successfully!");
          }
        } catch (err) {
          alert(
            err.response?.data?.message ||
            "Failed to link calendar."
          );
        }
      },
    });
    client.requestCode({ prompt: "consent" });
  };

  const handleUnlinkCalendar = async () => {
    if (window.confirm("Are you sure you want to unlink your Google Calendar?")) {
      try {
        await unlinkCalendar();
        setUser({ ...user, isCalendarLinked: false });
        setEvents([]); 
        alert("Calendar unlinked successfully.");
      } catch (err) {
        alert(err.response?.data?.message || "Failed to unlink calendar.");
      }
    }
  };

  const openAddModal = () => {
    setEditingEvent(null);
    setEventForm({ title: '', start: moment().format('YYYY-MM-DDTHH:mm'), end: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm') });
    setShowEventModal(true);
  };

  const openEditModal = (event) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      start: moment(event.start).format('YYYY-MM-DDTHH:mm'),
      end: moment(event.end).format('YYYY-MM-DDTHH:mm')
    });
    setShowEventModal(true);
  };

  const handleSaveEvent = async (e) => {
    e.preventDefault();
    try {
      if (editingEvent) {
        await updateCalendarEvent(editingEvent.id, eventForm);
        alert("Event updated!");
      } else {
        await addCalendarEvent(eventForm);
        alert("Event added!");
      }
      setShowEventModal(false);
      setLoadingCalendar(true);
      const res = await getCalendarEvents();
      setEvents(res.events || []);
      setLoadingCalendar(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to save event");
    }
  };

  const handleDeleteEvent = async () => {
    if (!editingEvent || !window.confirm("Are you sure you want to delete this event?")) return;
    try {
      await deleteCalendarEvent(editingEvent.id);
      alert("Event deleted!");
      setShowEventModal(false);
      setLoadingCalendar(true);
      const res = await getCalendarEvents();
      setEvents(res.events || []);
      setLoadingCalendar(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete event");
    }
  };

  return (
    <div className="dashboard-container">
      {/* Top Navigation Bar */}
      <nav className="dashboard-navbar">
        <div className="navbar-brand">
          <svg className="brand-logo" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          <span className="brand-title">Dashboard</span>
        </div>

        <div className="navbar-links">
          <button 
            className={`nav-link ${activeTab === 'Home' ? 'active' : ''}`}
            onClick={() => setActiveTab('Home')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Home
          </button>
          <button 
            className={`nav-link ${activeTab === 'Calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('Calendar')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Calendar
          </button>
          <button 
            className={`nav-link ${activeTab === 'EmailConfig' ? 'active' : ''}`}
            onClick={() => setActiveTab('EmailConfig')}
          >
            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
               <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
               <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
            Email Config
          </button>
        </div>

        <div className="navbar-profile" style={{ position: 'relative' }}>
          <button className="profile-btn" onClick={() => setShowProfileMenu(true)}>
            <div className="profile-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <span className="profile-name">My Info</span>
          </button>

          {showProfileMenu && (
            <ProfilePopup onClose={() => setShowProfileMenu(false)} />
          )}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="dashboard-content">
        <header className="content-header">
          <h1>{activeTab === 'Home' ? 'Welcome Back!' : activeTab === 'Calendar' ? 'Your Calendar' : 'Email Configuration'}</h1>
          <p className="subtitle">
            {activeTab === 'Home' 
              ? 'Here is an overview of your events and tasks today.' 
              : activeTab === 'Calendar' ? 'Manage your schedule and upcoming meetings.'
              : 'Control which senders are trusted and how detected events are handled.'}
          </p>
        </header>

        <div className="content-body">
          {activeTab === 'Home' ? (
            <>
              <div className="dashboard-cards" style={{marginBottom: '2rem'}}>
                <div className="dash-card">
                  <h3>Integrations</h3>
                  {user?.isCalendarLinked ? (
                    <div className="calendar-status" style={{display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px'}}>
                      <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'green'}}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                          <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <span>Calendar is Linked</span>
                      </div>
                      <button onClick={handleUnlinkCalendar} style={{
                        padding: '6px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: 'fit-content', fontSize: '13px'
                      }}>
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <div style={{marginTop: '10px'}}>
                      <p style={{fontSize: '0.9em', color: '#666', marginBottom: '10px'}}>Link your Google Calendar to sync events.</p>
                      <button onClick={handleLinkCalendar} style={{
                        padding: '8px 16px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                      }}>
                        Link Calendar
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="dash-card">
                  <h3>AI Scheduler Status</h3>
                  {schedulerStatus ? (
                    <div style={{display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.9rem', marginTop: '10px'}}>
                      <div><strong>Status:</strong> <span style={{color: schedulerStatus.schedulerEnabled ? '#155724' : '#721c24'}}>{schedulerStatus.schedulerEnabled ? 'Enabled' : 'Disabled'}</span></div>
                      <div><strong>Last Run:</strong> {schedulerStatus.status?.lastRunAt ? new Date(schedulerStatus.status.lastRunAt).toLocaleString() : 'N/A'}</div>
                      <div><strong>Processed:</strong> {schedulerStatus.status?.lastResult?.processedMessages || 0} emails</div>
                    </div>
                  ) : (
                    <div className="card-placeholder" style={{minHeight: '80px', marginTop: '10px'}}>Status unavailable</div>
                  )}
                </div>
              </div>

              <div className="ai-events-dashboard">
                {aiEventsError && <div style={{padding: '1rem', background: '#fee', color: '#c00', border: '1px solid #fcc', borderRadius: '8px', marginBottom: '1rem'}}>{aiEventsError}</div>}
                {aiSuccessMessage && <div style={{padding: '1rem', background: '#efe', color: '#060', border: '1px solid #cfc', borderRadius: '8px', marginBottom: '1rem'}}>{aiSuccessMessage}</div>}

                <div className="events-tabs">
                  <button className={`events-tab ${eventsTab === "pending" ? "active" : ""}`} onClick={() => setEventsTab("pending")}>Pending ({pendingAiEvents.length})</button>
                  <button className={`events-tab ${eventsTab === "scheduled" ? "active" : ""}`} onClick={() => setEventsTab("scheduled")}>Scheduled</button>
                  <button className={`events-tab ${eventsTab === "confirmed" ? "active" : ""}`} onClick={() => setEventsTab("confirmed")}>Confirmed</button>
                  <button className={`events-tab ${eventsTab === "all" ? "active" : ""}`} onClick={() => setEventsTab("all")}>All Events</button>
                  
                  <div style={{flex: 1}}></div>
                  <button 
                    onClick={handleProcessEmailsNow} 
                    disabled={loadingAiEvents}
                    style={{
                      padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', 
                      display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', margin: 'auto 10px'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    {loadingAiEvents ? "Fetching..." : "Fetch New Emails"}
                  </button>
                </div>
                
                <div style={{marginTop: '1.5rem'}}>
                  <h2 style={{fontSize: '1.25rem', marginBottom: '1rem', color: '#0f172a'}}>Detected Events</h2>
                  {loadingAiEvents && futureAiEvents.length === 0 ? (
                    <div className="card-placeholder" style={{padding: '2rem'}}>Loading events...</div>
                  ) : futureAiEvents.length === 0 ? (
                    <div className="card-placeholder" style={{padding: '2rem'}}>No upcoming events in this category.</div>
                  ) : (
                    renderEventsGrid(futureAiEvents, false)
                  )}
                </div>

                <div style={{marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0'}}>
                  <h2 style={{fontSize: '1.25rem', margin: '0 0 1rem 0', color: '#0f172a'}}>Past Events ({pastAiEvents.length})</h2>
                  {pastAiEvents.length === 0 ? (
                    <div className="card-placeholder" style={{padding: '2rem'}}>No past events in this category.</div>
                  ) : (
                    renderEventsGrid(pastAiEvents, true)
                  )}
                </div>
              </div>
            </>
          ) : activeTab === 'Calendar' ? (
            <div className="calendar-view">
              {!user?.isCalendarLinked ? (
                <div className="calendar-placeholder">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <p>Please link your Google Calendar</p>
                  <button onClick={handleLinkCalendar} style={{
                    padding: '8px 16px', backgroundColor: '#4285f4', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginTop: '10px', fontWeight: 'bold'
                  }}>
                    Link Calendar
                  </button>
                </div>
              ) : (
                <div className="events-list" style={{padding: '20px', backgroundColor: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', height: '700px', display: 'flex', flexDirection: 'column', position: 'relative'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <h2>Your Calendar</h2>
                    <button onClick={openAddModal} style={{
                      padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
                    }}>
                      + Add Event
                    </button>
                  </div>

                  {loadingCalendar ? (
                    <div style={{marginTop: '20px', color: '#666'}}>Loading your calendar...</div>
                  ) : (
                    <div style={{flex: 1, marginTop: '15px'}}>
                      <Calendar
                        localizer={localizer}
                        events={events.map(e => ({
                          id: e.id,
                          title: e.summary || '(No title)',
                          start: new Date(e.start.dateTime || e.start.date),
                          end: new Date(e.end.dateTime || e.end.date || e.start.dateTime || e.start.date),
                          allDay: !!e.start.date
                        }))}
                        startAccessor="start"
                        endAccessor="end"
                        style={{ height: '100%', minHeight: '500px' }}
                        views={['month', 'week', 'day', 'agenda']}
                        defaultView="month"
                        date={calendarDate}
                        onNavigate={(newDate) => setCalendarDate(newDate)}
                        onSelectEvent={(event) => openEditModal(event)}
                      />
                    </div>
                  )}

                  {showEventModal && (
                    <div className="modern-modal-overlay">
                      <div className="modern-modal">
                        <div className="modern-modal-header">
                          <h3>{editingEvent ? 'Edit Event' : 'Add New Event'}</h3>
                          <button type="button" onClick={() => setShowEventModal(false)} className="close-btn">&times;</button>
                        </div>
                        <form onSubmit={handleSaveEvent} className="modern-modal-form">
                          <div className="form-group">
                            <label>Event Title</label>
                            <input type="text" required value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} placeholder="e.g. Team Meeting" />
                          </div>
                          <div className="form-row">
                            <div className="form-group">
                              <label>Start Time</label>
                              <input type="datetime-local" required value={eventForm.start} onChange={e => setEventForm({...eventForm, start: e.target.value})} />
                            </div>
                            <div className="form-group">
                              <label>End Time</label>
                              <input type="datetime-local" required value={eventForm.end} onChange={e => setEventForm({...eventForm, end: e.target.value})} />
                            </div>
                          </div>
                          <div className="modern-modal-actions">
                            {editingEvent && (
                              <button type="button" onClick={handleDeleteEvent} className="btn btn-delete">
                                Delete
                              </button>
                            )}
                            <div style={{ flex: 1 }}></div>
                            <button type="button" onClick={() => setShowEventModal(false)} className="btn btn-secondary" style={{ backgroundColor: '#e2e8f0', color: '#333' }}>
                              Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#2563eb', color: '#fff' }}>
                              {editingEvent ? 'Save Changes' : '+ Add Event'}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          ) : (
            <div className="email-config-view" style={{marginTop: '20px'}}>
              {emailConfigLoading ? (
                <div style={{padding: '2rem'}}>Loading email configuration...</div>
              ) : (
                <>
                  <div className="stats-strip">
                    <div className="stat-card">
                      <span className="stat-label">Whitelist Mode</span>
                      <span className={`stat-value ${enforceWhitelist ? "state-on" : "state-off"}`}>
                        {enforceWhitelist ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Allowed Senders</span>
                      <span className="stat-value">{allowedSenders.length}</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-label">Active Senders</span>
                      <span className="stat-value">{activeSendersCount}</span>
                    </div>
                  </div>

                  {emailConfigError && <div className="alert alert-error">{emailConfigError}</div>}
                  {emailConfigSuccess && <div className="alert alert-success">{emailConfigSuccess}</div>}

                  <div className="email-config-grid">
                    <section className="email-config-section whitelist-section">
                      <div className="section-header">
                        <h2>Allowed Email Senders (Security Whitelist)</h2>
                        <div className="whitelist-toggle">
                          <label className="toggle-label">
                            <input
                              type="checkbox"
                              checked={enforceWhitelist}
                              onChange={handleToggleWhitelist}
                            />
                            <span>Enforce Whitelist</span>
                          </label>
                          <span className="toggle-desc">
                            {enforceWhitelist ? "Only process emails from allowed senders" : "Allow processing from any sender"}
                          </span>
                        </div>
                      </div>

                      {enforceWhitelist && (
                        <>
                          <p className="section-info">
                            Only emails from these addresses will be processed by the app. This protects your personal data from being read.
                          </p>

                          <form onSubmit={handleAddAllowedSender} className="add-email-form">
                            <input
                              type="email"
                              value={newAllowedEmail}
                              onChange={(e) => setNewAllowedEmail(e.target.value)}
                              placeholder="Email address (e.g., boss@company.com)"
                              className="email-input"
                            />
                            <input
                              type="text"
                              value={newAllowedDisplayName}
                              onChange={(e) => setNewAllowedDisplayName(e.target.value)}
                              placeholder="Display name (optional)"
                              className="email-input"
                            />
                            <button type="submit" className="btn btn-primary">
                              Add Sender
                            </button>
                          </form>

                          <div className="senders-list">
                            {allowedSenders.length === 0 ? (
                              <p className="empty-state">⚠️ No allowed senders configured. Email processing is disabled.</p>
                            ) : (
                              <div className="senders-table">
                                {allowedSenders.map((sender) => (
                                  <div key={sender.email} className="sender-item">
                                    <div className="sender-info">
                                      <span className="sender-email">{sender.email}</span>
                                      {sender.displayName && <span className="sender-name">{sender.displayName}</span>}
                                      <span className="sender-status">
                                        {sender.isActive ? "✓ Active" : "○ Inactive"}
                                      </span>
                                    </div>
                                    <div className="sender-actions">
                                      <button
                                        onClick={() => handleToggleAllowedSender(sender.email)}
                                        className={`btn btn-sm ${
                                          sender.isActive ? "btn-secondary" : "btn-success"
                                        }`}
                                      >
                                        {sender.isActive ? "Disable" : "Enable"}
                                      </button>
                                      <button
                                        onClick={() => handleRemoveAllowedSender(sender.email)}
                                        className="btn btn-sm btn-danger"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {!enforceWhitelist && (
                        <p className="warning-message">
                          ⚠️ Whitelist is disabled. The app can access emails from any sender. Enable whitelist to protect your privacy.
                        </p>
                      )}
                    </section>
                  </div>

                  <section className="email-config-section preferences-section" style={{marginTop: '20px'}}>
                    <h2>Email Preferences</h2>
                    <div className="preferences-grid">
                      <label className="preference-item">
                        <input
                          type="checkbox"
                          checked={preferences.schedulerEnabled ?? true}
                          onChange={(e) =>
                            handlePreferenceChange("schedulerEnabled", e.target.checked)
                          }
                        />
                        <span className="preference-label">Enable Automatic Scheduling</span>
                        <span className="preference-desc">
                          Turn automatic email scheduling on or off. When off, new emails are not auto-processed.
                        </span>
                      </label>

                      <label className="preference-item">
                        <input
                          type="checkbox"
                          checked={preferences.autoSchedule}
                          onChange={(e) =>
                            handlePreferenceChange("autoSchedule", e.target.checked)
                          }
                        />
                        <span className="preference-label">Auto Schedule Events</span>
                        <span className="preference-desc">
                          Automatically schedule detected events without confirmation
                        </span>
                      </label>

                      <label className="preference-item">
                        <input
                          type="checkbox"
                          checked={preferences.requireConfirmation}
                          onChange={(e) =>
                            handlePreferenceChange("requireConfirmation", e.target.checked)
                          }
                        />
                        <span className="preference-label">Require Confirmation</span>
                        <span className="preference-desc">
                          Ask for your approval before scheduling events
                        </span>
                      </label>

                      <label className="preference-item">
                        <input
                          type="checkbox"
                          checked={preferences.autoCalendarSync}
                          onChange={(e) =>
                            handlePreferenceChange("autoCalendarSync", e.target.checked)
                          }
                        />
                        <span className="preference-label">Auto Sync to Calendar</span>
                        <span className="preference-desc">
                          Automatically add confirmed events to Google Calendar
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleSavePreferences}
                      className="btn btn-primary btn-lg"
                      style={{marginTop: '20px'}}
                    >
                      Save Preferences
                    </button>
                  </section>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Home;
