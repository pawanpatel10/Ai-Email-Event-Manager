import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, 'backend', '.env') });

import User from './backend/models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  await User.updateMany({}, { $unset: { googleRefreshToken: 1, googleAccessToken: 1 } });
  
  // Set isCalendarLinked to false
  await User.updateMany({}, { $set: { isCalendarLinked: false } });
  
  console.log('Tokens cleared and isCalendarLinked reset! Users must log in again to acquire clean tokens.');
  process.exit(0);
};

run().catch(console.error);
