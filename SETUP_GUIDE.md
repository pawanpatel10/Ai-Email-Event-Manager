# 🚀 Setup & Configuration Guide

## Prerequisites
- Node.js v14+ and npm
- Python 3.8+
- MongoDB (local or Atlas)
- Google Cloud Account

---

## Step 1: Google Cloud Setup (10 minutes)

### 1.1 Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create new project: "Email Event Manager"
3. Wait for project creation

### 1.2 Enable APIs
1. Search for "Gmail API" → Enable
2. Search for "Google Calendar API" → Enable
3. Wait for APIs to be enabled

### 1.3 Create OAuth Credentials
1. Go to "Credentials" in left sidebar
2. Click "Create Credentials" → "OAuth Client ID"
3. If prompted, configure OAuth consent screen first:
   - Choose "External"
   - Add basic app info
   - Add scopes: `gmail.readonly`, `calendar`
   - Add test users
4. Create OAuth 2.0 Client ID:
   - Application type: "Web application"
   - Authorized redirect URIs: `http://localhost:5000`
   - Save Client ID and Secret

### 1.4 Download Credentials
1. Download OAuth credentials as JSON
2. Save as `backend/app/config/oauth_config.json`

---

## Step 2: Local Setup (15 minutes)

### 2.1 Clone/Navigate to Project
```bash
cd c:\Users\PAVAN PATEL\OneDrive\Desktop\Ai-Email-Event-Manager
```

### 2.2 Backend Setup
```bash
cd backend
npm install
```

### 2.3 Frontend Setup
```bash
cd frontend
npm install
```

### 2.4 Python Setup
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

---

## Step 3: Environment Configuration (5 minutes)

### 3.1 Create Backend .env File
Create `backend/.env`:
```env
# Database
MONGODB_URI=mongodb://localhost:27017/email-event-manager

# JWT Tokens
JWT_SECRET=your_super_secret_key_here_change_in_production
JWT_REFRESH_SECRET=your_super_secret_refresh_key_here_change_in_production

# Google OAuth
GOOGLE_CLIENT_ID=your_client_id_from_google_cloud
GOOGLE_CLIENT_SECRET=your_client_secret_from_google_cloud

# Server
PORT=5000
NODE_ENV=development
```

### 3.2 Verify OAuth Config
Check that `backend/app/config/oauth_config.json` exists with:
```json
{
  "installed": {
    "client_id": "...",
    "client_secret": "...",
    "redirect_uris": ["http://localhost:5000"],
    ...
  }
}
```

---

## Step 4: Start Services (5 minutes)

### Option A: Using Multiple Terminals (Recommended)

**Terminal 1 - MongoDB:**
```bash
mongod
```
Expected output: `listening on port 27017`

**Terminal 2 - Backend:**
```bash
cd backend
npm run dev
```
Expected output: `Server running on port 5000`

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```
Expected output: `Local: http://localhost:5173`

### Option B: Using npm-run-all (Single Terminal)
```bash
# From root directory
npm install -g npm-run-all

# From backend directory
npm run dev
```

---

## Step 5: Verify Setup (10 minutes)

### 5.1 Test Backend
```bash
# In PowerShell, test API
curl http://localhost:5000
# Expected: "Auth API is running..."
```

### 5.2 Test Frontend
Open browser: http://localhost:5173

### 5.3 Test Database
```bash
# Open MongoDB compass or shell
mongo
> show dbs
```

---

## Step 6: First-Time Usage

### 6.1 User Registration
1. Go to http://localhost:5173
2. Click "Sign Up"
3. Enter name, email, password
4. Verify OTP sent to email
5. Login

### 6.2 Configure Email Addresses
1. Click "Email Configuration"
2. Click "Add Email"
3. Enter email (e.g., `work@company.com`)
4. Click "Add Email"
5. See email appear in list

### 6.3 Set Preferences
1. Scroll to "Email Preferences"
2. Optional: Enable "Auto Schedule Events"
3. Optional: Toggle "Require Confirmation"
4. Enable "Auto Sync to Calendar"
5. Click "Save Preferences"

### 6.4 Test Event Detection
1. Send test email to configured address:
   ```
   Subject: Team Meeting Tomorrow
   Body: Let's have a meeting tomorrow at 2:00 PM in the conference room.
   ```

2. Go to Dashboard
3. Should see pending event (if background processing is running)

---

## Step 7: Add Background Email Processing (Optional but Recommended)

Create `backend/services/emailProcessing.js`:
```javascript
const cron = require('node-cron');
const User = require('../models/User');
const { GmailEmailReader } = require('../app/email_module/email_reader');

// Run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    const users = await User.find({
      'connectedEmails.0': { $exists: true }
    });

    for (const user of users) {
      const activeEmails = user.connectedEmails
        .filter(e => e.isActive)
        .map(e => e.email);

      if (activeEmails.length === 0) continue;

      // Process emails for user
      await processUserEmails(user._id, activeEmails, user.googleAccessToken);
    }
  } catch (err) {
    console.error('Email processing error:', err);
  }
});

async function processUserEmails(userId, emailAddresses, token) {
  // Implementation here
}

module.exports = { startEmailProcessing: () => {} };
```

Then add to `backend/server.js`:
```javascript
import { startEmailProcessing } from './services/emailProcessing.js';

// After app initialization
startEmailProcessing();
```

Finally:
```bash
npm install node-cron
```

---

## Troubleshooting

### MongoDB Connection Error
**Problem:** `MongoServerSelectionError`
```
Solution:
1. Ensure MongoDB is running: mongod
2. Check MONGODB_URI in .env
3. Try: mongosh (newer) or mongo (older)
```

### Port Already in Use
**Problem:** `Error: listen EADDRINUSE :::5000`
```
Solution:
# Find process using port 5000
lsof -i :5000
# Kill it (Windows PowerShell):
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

### Google OAuth Error
**Problem:** `Client ID mismatch`
```
Solution:
1. Verify GOOGLE_CLIENT_ID in .env
2. Check oauth_config.json exists
3. Ensure redirect URI matches: http://localhost:5000
4. Clear browser cache and cookies
```

### NLP Processing Error
**Problem:** `OSError: [E050] Can't find model 'en_core_web_sm'`
```
Solution:
python -m spacy download en_core_web_sm
```

### Email Not Detected
**Problem:** Events not appearing in Dashboard
```
Debugging:
1. Verify email is added in Email Config
2. Check email preference allows processing
3. See if background job is running
4. Check backend console for errors
5. Verify NLP keywords match email content
```

---

## Common Tasks

### Reset Database
```bash
# Using MongoDB shell
mongo
> use email-event-manager
> db.dropDatabase()
> exit
```

### View All Events
```bash
mongo
> use email-event-manager
> db.events.find().pretty()
```

### Clear User Emails
```javascript
// In MongoDB
db.users.updateOne(
  { _id: ObjectId("...") },
  { $set: { connectedEmails: [] } }
)
```

### Manual Email Processing Test
Create `test_email_processing.js`:
```javascript
const { GmailEmailReader } = require('./app/email_module/email_reader');

async function test() {
  const reader = new GmailEmailReader(credentials);
  const emails = await reader.get_unread_emails(['test@gmail.com']);
  console.log('Found emails:', emails.length);
}

test();
```

---

## Production Deployment Checklist

- [ ] Set NODE_ENV=production
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS
- [ ] Use environment variables from secure vault
- [ ] Set up database backups
- [ ] Configure CORS properly
- [ ] Add rate limiting to API
- [ ] Set up error logging service
- [ ] Enable email notifications
- [ ] Test disaster recovery
- [ ] Security audit
- [ ] Performance testing

---

## Support Resources

- **Gmail API Docs:** https://developers.google.com/gmail/api
- **Google Calendar API:** https://developers.google.com/calendar/api
- **MongoDB Docs:** https://docs.mongodb.com
- **React Docs:** https://react.dev
- **Express Docs:** https://expressjs.com
- **spaCy Docs:** https://spacy.io

---

## Next Steps After Setup

1. ✅ Complete Steps 1-7
2. Test with sample emails
3. Add background email processing
4. Configure calendar sync endpoint
5. Set up error logging
6. Performance optimization
7. Security audit
8. Deployment preparation

---

**You're all set! 🎉**

If you encounter any issues, check the troubleshooting section above or review the documentation in `/docs/IMPLEMENTATION.md`.
