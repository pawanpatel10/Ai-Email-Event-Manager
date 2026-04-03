import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import User from './models/User.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const users = await User.find({});
  for (const u of users) {
    console.log(`Email: ${u.email}`);
    console.log(`Calendar Linked: ${u.isCalendarLinked}`);
    console.log(`Token starts with: ${u.googleRefreshToken ? u.googleRefreshToken.substring(0, 15) : 'NONE'}`);
    console.log('---');
  }
  process.exit(0);
};

run().catch(console.error);
