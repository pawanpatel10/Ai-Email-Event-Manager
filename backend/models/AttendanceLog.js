import mongoose from "mongoose";

const attendanceLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    action: {
      type: String,
      enum: ["attended", "not_attended", "auto_marked_not_attended"],
      required: true,
    },
    loggedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const AttendanceLog = mongoose.model("AttendanceLog", attendanceLogSchema);

export default AttendanceLog;
