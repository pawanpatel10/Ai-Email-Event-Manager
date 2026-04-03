import api from "./api";

export const linkCalendar = async (code) => {
  const res = await api.post("/calendar/link", { code });
  return res.data;
};

export const getCalendarEvents = async () => {
  const res = await api.get("/calendar/events");
  return res.data;
};

export const unlinkCalendar = async () => {
  const res = await api.post("/calendar/unlink");
  return res.data;
};

export const addCalendarEvent = async (data) => {
  const res = await api.post("/calendar/events", data);
  return res.data;
};

export const updateCalendarEvent = async (id, data) => {
  const res = await api.put(`/calendar/events/${id}`, data);
  return res.data;
};

export const deleteCalendarEvent = async (id) => {
  const res = await api.delete(`/calendar/events/${id}`);
  return res.data;
};
