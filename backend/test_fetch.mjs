import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import User from './models/User.js';
import { processUserConnectedEmails } from './services/emailProcessingService.js';

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: 'padala.20243192@mnnit.ac.in' });
  if (!user) return console.log('no user');
  
  try {
    const res = await processUserConnectedEmails(user);
    console.log("Success:", res);
  } catch (err) {
    console.error("Error:", err.message);
  }
  process.exit(0);
};

run().catch(console.error);
