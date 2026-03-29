import User from "../models/User.js";
import { processUserConnectedEmails } from "./emailProcessingService.js";

let schedulerHandle = null;
const runningUserIds = new Set();
const userRetryState = new Map();

const TRANSIENT_FAILURE_COOLDOWN_MINUTES = 10;

const toPositiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const isGoogleAuthError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("invalid authentication credentials") ||
    normalized.includes("insufficient authentication scopes") ||
    normalized.includes("google access token missing") ||
    normalized.includes("unauthenticated") ||
    normalized.includes("invalid_grant") ||
    normalized.includes("token has been expired or revoked")
  );
};

const shouldClearRefreshToken = (message = "") => {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("invalid_grant") ||
    normalized.includes("token has been expired or revoked") ||
    normalized.includes("revoked")
  );
};

const isTransientNetworkError = (message = "") => {
  const normalized = String(message).toLowerCase();
  return (
    normalized.includes("enotfound") ||
    normalized.includes("eai_again") ||
    normalized.includes("etimedout") ||
    normalized.includes("econnreset") ||
    normalized.includes("network request failed") ||
    normalized.includes("fetch failed")
  );
};

const getRetryInfo = (userId) => userRetryState.get(userId);

const setRetryCooldown = (userId, now) => {
  const retryAt = new Date(
    now.getTime() + TRANSIENT_FAILURE_COOLDOWN_MINUTES * 60 * 1000
  );

  userRetryState.set(userId, {
    retryAt,
  });

  return retryAt;
};

const clearRetryCooldown = (userId) => {
  userRetryState.delete(userId);
};

const processUserSafely = async (user) => {
  const userId = user._id.toString();
  const now = new Date();

  if (runningUserIds.has(userId)) {
    return;
  }

  runningUserIds.add(userId);

  try {
    const retryInfo = getRetryInfo(userId);
    if (retryInfo?.retryAt && now < retryInfo.retryAt) {
      return;
    }

    const latestPreferences = await User.findById(userId)
      .select("emailPreferences.schedulerEnabled")
      .lean();

    const schedulerEnabled =
      latestPreferences?.emailPreferences?.schedulerEnabled ?? true;

    if (!schedulerEnabled) {
      return;
    }

    const result = await processUserConnectedEmails(user);
    const created = result?.createdEvents ?? result?.created ?? 0;
    const scheduled = result?.scheduledEvents ?? result?.scheduled ?? 0;

    if (created > 0 || scheduled > 0) {
      console.log(
        `[EmailScheduler] User ${user.email}: processed=${result.processedMessages || 0}, created=${created}, scheduled=${scheduled}`
      );
    }

    const updateDoc = {
      "schedulerStatus.lastRunAt": now,
      "schedulerStatus.lastResult.processedMessages": result?.processedMessages || 0,
      "schedulerStatus.lastResult.createdEvents": result?.createdEvents || 0,
      "schedulerStatus.lastResult.scheduledEvents": result?.scheduledEvents || 0,
      "schedulerStatus.lastResult.skippedAlreadyProcessed":
        result?.skippedAlreadyProcessed || 0,
      "schedulerStatus.lastResult.skippedNonEvent": result?.skippedNonEvent || 0,
      "schedulerStatus.lastError": "",
    };

    if ((result?.processedMessages || 0) > 0) {
      updateDoc["schedulerStatus.lastProcessedAt"] = now;
    }

    await User.findByIdAndUpdate(userId, {
      $set: updateDoc,
    });

    clearRetryCooldown(userId);
  } catch (error) {
    const errorMessage = error.message || String(error);
    const shouldClearGoogleToken = isGoogleAuthError(errorMessage);
    const clearRefreshToken = shouldClearRefreshToken(errorMessage);
    const transientNetworkError = isTransientNetworkError(errorMessage);
    let temporaryNetworkMessage = "";

    if (transientNetworkError) {
      const retryAt = setRetryCooldown(userId, now);
      temporaryNetworkMessage =
        `Temporary network/DNS issue while reaching Gmail API. Automatic retry at ${retryAt.toLocaleString()}.`;
    }

    const updateDoc = {
      "schedulerStatus.lastRunAt": now,
      "schedulerStatus.lastError": transientNetworkError
        ? temporaryNetworkMessage
        : shouldClearGoogleToken
          ? "Google connection expired or missing required permissions. Please reconnect Google from Home page."
          : errorMessage,
    };

    if (shouldClearGoogleToken) {
      updateDoc.googleAccessToken = null;
      if (clearRefreshToken) {
        updateDoc.googleRefreshToken = null;
      }
    }

    await User.findByIdAndUpdate(userId, {
      $set: updateDoc,
    });

    if (transientNetworkError) {
      console.warn(
        `[EmailScheduler] Temporary network failure for ${user.email}: ${errorMessage}`
      );
    } else {
      console.error(
        `[EmailScheduler] Failed for ${user.email}:`,
        errorMessage
      );
    }
  } finally {
    runningUserIds.delete(userId);
  }
};

const runSchedulerCycle = async () => {
  try {
    const users = await User.find({
      $and: [
        {
          $or: [
            { googleAccessToken: { $exists: true, $ne: null } },
            { googleRefreshToken: { $exists: true, $ne: null } },
          ],
        },
        {
          $or: [
            { "emailPreferences.schedulerEnabled": { $exists: false } },
            { "emailPreferences.schedulerEnabled": true },
          ],
        },
      ],
    }).select("_id email googleAccessToken googleRefreshToken emailPreferences allowedEmailSenders");

    if (users.length === 0) {
      return;
    }

    await Promise.all(users.map((user) => processUserSafely(user)));
  } catch (error) {
    console.error("[EmailScheduler] Scheduler cycle failed:", error.message || error);
  }
};

export const startEmailScheduler = () => {
  if (schedulerHandle) {
    return;
  }

  const intervalMinutes = toPositiveInteger(
    process.env.EMAIL_PROCESSING_INTERVAL_MINUTES,
    5
  );
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(
    `[EmailScheduler] Automatic email processing enabled (every ${intervalMinutes} minute(s)).`
  );

  runSchedulerCycle();
  schedulerHandle = setInterval(runSchedulerCycle, intervalMs);
};

export const stopEmailScheduler = () => {
  if (!schedulerHandle) {
    return;
  }

  clearInterval(schedulerHandle);
  schedulerHandle = null;
};
