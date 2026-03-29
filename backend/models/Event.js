import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    dateTime: {
      type: Date,
      required: true,
    },

    endDateTime: {
      type: Date,
    },

    location: {
      type: String,
    },

    duration: {
      type: Number, // in minutes
    },

    fromEmail: {
      type: String,
      required: true,
    },

    emailSubject: {
      type: String,
    },

    emailId: {
      type: String, // Gmail message ID
    },

    status: {
      type: String,
      enum: ["pending", "confirmed", "scheduled", "cancelled"],
      default: "pending",
    },

    googleCalendarEventId: {
      type: String,
    },

    confidence: {
      type: Number, // 0-1 score for how confident the system is
      default: 0,
    },

    requiresUserConfirmation: {
      type: Boolean,
      default: true,
    },

    userConfirmed: {
      type: Boolean,
      default: false,
    },

    confirmedAt: {
      type: Date,
    },

    extractedData: {
      originalText: String,
      entities: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
