import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const getDefaultSchedulerLastResult = () => ({
  processedMessages: 0,
  createdEvents: 0,
  scheduledEvents: 0,
  skippedAlreadyProcessed: 0,
  skippedNonEvent: 0,
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId; 
      },
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    otp: String,
    otpExpires: Date,

    googleId: {
      type: String,
      default: null,
    },

    googleAccessToken: {
      type: String,
      default: null,
    },

    googleRefreshToken: {
      type: String,
      default: null,
    },

    connectedEmails: [
      {
        email: {
          type: String,
          required: true,
          lowercase: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    allowedEmailSenders: [
      {
        email: {
          type: String,
          required: true,
          lowercase: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
        displayName: String,
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    emailPreferences: {
      schedulerEnabled: {
        type: Boolean,
        default: true,
      },
      autoSchedule: {
        type: Boolean,
        default: false,
      },
      requireConfirmation: {
        type: Boolean,
        default: true,
      },
      eventKeywords: [{
        type: String,
      }],
      autoCalendarSync: {
        type: Boolean,
        default: true,
      },
      enforceWhitelist: {
        type: Boolean,
        default: true,
      },
    },

    schedulerStatus: {
      lastRunAt: {
        type: Date,
      },
      lastProcessedAt: {
        type: Date,
      },
      lastResult: {
        processedMessages: {
          type: Number,
          default: 0,
        },
        createdEvents: {
          type: Number,
          default: 0,
        },
        scheduledEvents: {
          type: Number,
          default: 0,
        },
        skippedAlreadyProcessed: {
          type: Number,
          default: 0,
        },
        skippedNonEvent: {
          type: Number,
          default: 0,
        },
      },
      lastError: {
        type: String,
        default: "",
      },
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre("save", async function () {
  if (!this.password || !this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.pre("validate", function () {
  if (!this.schedulerStatus || typeof this.schedulerStatus !== "object") {
    this.schedulerStatus = {};
  }

  if (
    !this.schedulerStatus.lastResult ||
    typeof this.schedulerStatus.lastResult !== "object"
  ) {
    this.schedulerStatus.lastResult = getDefaultSchedulerLastResult();
    return;
  }

  this.schedulerStatus.lastResult = {
    ...getDefaultSchedulerLastResult(),
    ...this.schedulerStatus.lastResult,
  };
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;

  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;