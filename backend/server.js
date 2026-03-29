import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import emailRoutes from "./routes/emailRoutes.js";
import eventRoutes from "./routes/eventRoutes.js";
import { startEmailScheduler } from "./services/emailSchedulerService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

import { notFound, errorHandler } from "./middlewares/errorMiddleware.js";

connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());

const configuredOrigins = (process.env.FRONTEND_URLS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isLocalDevOrigin = (origin = "") => {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (no Origin header) and local dev ports.
      if (!origin || isLocalDevOrigin(origin) || configuredOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/email", emailRoutes);
app.use("/api/events", eventRoutes);

app.get("/", (req, res) => {
  res.send("Auth API is running...");
});

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startEmailScheduler();
});