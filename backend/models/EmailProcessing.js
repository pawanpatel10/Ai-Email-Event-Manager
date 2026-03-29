import mongoose from "mongoose";

const emailProcessingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    emailAddress: {
      type: String,
      required: true,
      lowercase: true,
    },

    gmailMessageId: {
      type: String,
      required: true,
      unique: true,
    },

    subject: {
      type: String,
    },

    from: {
      type: String,
    },

    body: {
      type: String,
    },

    receivedAt: {
      type: Date,
    },

    isEventEmail: {
      type: Boolean,
      default: false,
    },

    eventConfidence: {
      type: Number,
      default: 0,
    },

    extractedEvent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
    },

    processingStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed"],
      default: "pending",
    },

    processingError: {
      type: String,
    },

    processedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const EmailProcessing = mongoose.model("EmailProcessing", emailProcessingSchema);

export default EmailProcessing;
