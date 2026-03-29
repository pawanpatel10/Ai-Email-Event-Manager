import api from "./api";

/**
 * Event-related API calls
 */

// Get all events for user
export const getEvents = async (status = null) => {
  try {
    const config = status ? { params: { status } } : {};
    const response = await api.get("/events", config);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get specific event
export const getEventById = async (eventId) => {
  try {
    const response = await api.get(`/events/${eventId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get pending events (requiring user confirmation)
export const getPendingEvents = async () => {
  try {
    const response = await api.get("/events/pending/list");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Get scheduler status for current user
export const getSchedulerStatus = async () => {
  try {
    const response = await api.get("/events/scheduler-status");
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Confirm/approve event
export const confirmEvent = async (eventId, updates = {}) => {
  try {
    const response = await api.patch(`/events/${eventId}/confirm`, updates);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Reject event
export const rejectEvent = async (eventId) => {
  try {
    const response = await api.patch(`/events/${eventId}/reject`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Delete event
export const deleteEvent = async (eventId) => {
  try {
    const response = await api.delete(`/events/${eventId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Manually sync event to Google Calendar
export const syncEventToCalendar = async (eventId) => {
  try {
    const response = await api.post(`/events/${eventId}/sync-calendar`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};
