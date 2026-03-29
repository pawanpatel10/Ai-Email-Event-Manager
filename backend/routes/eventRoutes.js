import express from "express";
import {
  getUserEvents,
  getEventById,
  confirmEvent,
  rejectEvent,
  deleteEvent,
  syncEventToCalendar,
  getPendingEvents,
  processEmailsNow,
  getSchedulerStatus,
} from "../controllers/eventController.js";
import protect from "../middlewares/authMiddleware.js";

const router = express.Router();

// Protect all routes
router.use(protect);

// Events
router.get("/", getUserEvents);
router.get("/scheduler-status", getSchedulerStatus);
router.post("/process-emails", processEmailsNow);
router.get("/pending/list", getPendingEvents);
router.get("/:id", getEventById);
router.patch("/:id/confirm", confirmEvent);
router.patch("/:id/reject", rejectEvent);
router.post("/:id/sync-calendar", syncEventToCalendar);
router.delete("/:id", deleteEvent);

export default router;
