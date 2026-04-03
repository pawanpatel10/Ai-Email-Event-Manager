import express from "express";
import { linkCalendar, getCalendarEvents, unlinkCalendar, addEvent, updateEvent, deleteEvent } from "../controllers/calendarController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/link", protect, linkCalendar);
router.post("/unlink", protect, unlinkCalendar);
router.get("/events", protect, getCalendarEvents);
router.post("/events", protect, addEvent);
router.put("/events/:id", protect, updateEvent);
router.delete("/events/:id", protect, deleteEvent);

export default router;
