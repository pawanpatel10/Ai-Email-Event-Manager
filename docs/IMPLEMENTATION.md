# AI Email Event Manager - Implementation Guide

## Overview

This document provides a comprehensive guide to the AI Email Event Manager platform implementation. The application automatically detects events from user emails and schedules them in Google Calendar.

## Architecture & Features Implemented

### 1. Backend Features

#### Database Models
- **User Model** - Extended with:
  - `connectedEmails[]` - Array of email addresses to monitor
  - `googleAccessToken` - Google OAuth access token for Calendar API
  - `googleRefreshToken` - Google OAuth refresh token
  - `emailPreferences` - User preferences for email processing

- **Event Model** - Stores detected events:
  - Event details (title, date, time, location, duration)
  - Status tracking (pending, confirmed, scheduled, cancelled)
  - User confirmation tracking
  - Google Calendar event ID mapping
  - Confidence score for AI extraction

- **EmailProcessing Model** - Logs email processing:
  - Email metadata
  - Processing status
  - Reference to extracted event
  - Extraction confidence

#### API Routes

**Email Configuration** (`/api/email`)
- `POST /connected-emails` - Add email to monitor
- `GET /connected-emails` - Get all connected emails
- `DELETE /connected-emails/:emailId` - Remove email
- `PATCH /connected-emails/:emailId/toggle` - Enable/disable email
- `PUT /preferences` - Update email preferences
- `GET /preferences` - Get user preferences

**Event Management** (`/api/events`)
- `GET /` - Get all events
- `GET /pending/list` - Get pending events
- `GET /:id` - Get event details
- `PATCH /:id/confirm` - Confirm event
- `PATCH /:id/reject` - Reject event
- `DELETE /:id` - Delete event

#### Python Modules

**Email Module**
- `email_reader.py` - Reads emails from Gmail API
- `email_processor.py` - Processes emails and coordinates NLP
- `email_filters.py` - Filters spam and irrelevant emails
- `email_utils.py` - Helper utilities

**NLP Module**
- `nlp_pipeline.py` - Complete NLP pipeline for event extraction
- `event_classifier.py` - Classifies if email contains event
- `entity_extractor.py` - Extracts locations and descriptions
- `time_parser.py` - Parses dates, times, durations
- `confidence_engine.py` - Calculates extraction confidence

**Calendar Module**
- `google_calendar_service.py` - Google Calendar API integration
- Event creation, updating, deletion
- Free/busy checking
- Calendar search

### 2. Frontend Features

#### Pages

1. **Home Page** (`/home`)
   - Welcome dashboard
   - Feature overview
   - Navigation to email config and dashboard
   - Instructions on how the system works

2. **Email Configuration** (`/email-config`)
   - Add/remove email addresses to monitor
   - Toggle emails active/inactive
   - Set email processing preferences
   - Configure auto-scheduling and confirmation settings

3. **Event Dashboard** (`/dashboard`)
   - View all detected events
   - Confirm or reject pending events
   - Delete events
   - Filter events by status
   - See extraction confidence scores

#### Services

- `emailService.js` - API calls for email management
- `eventService.js` - API calls for event management

## Setup Instructions

### Prerequisites
- Node.js (v14+)
- Python 3.8+
- MongoDB
- Google Cloud Project with Gmail and Calendar APIs enabled

### Environment Variables

Create `.env` file in backend directory:
```
MONGODB_URI=mongodb://localhost:27017/email-event-manager
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
PORT=5000
NODE_ENV=development
```

### Installation

1. **Backend Setup**
   ```bash
   cd backend
   npm install
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

3. **Python Dependencies**
   ```bash
   pip install -r requirements.txt
   python -m spacy download en_core_web_sm
   ```

### Running the Application

1. **Start MongoDB**
   ```bash
   mongod
   ```

2. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```
   Server runs on `http://localhost:5000`

3. **Start Frontend Development Server**
   ```bash
   cd frontend
   npm run dev
   ```
   Frontend runs on `http://localhost:5173`

## User Flow

1. **User Registration/Login**
   - User creates account or logs in with Google
   - Google account automatically sets up OAuth for Calendar access

2. **Email Configuration**
   - User navigates to Email Configuration page
   - Adds email addresses they want to monitor
   - Sets preferences (auto-schedule, require confirmation, etc.)

3. **Email Processing**
   - System periodically checks configured emails (via scheduled task)
   - NLP pipeline analyzes email content
   - Detects if email contains event information

4. **Event Detection & Confirmation**
   - Detected events shown in Dashboard as pending
   - Shows extraction confidence score
   - User can confirm or reject events

5. **Calendar Sync**
   - Confirmed events automatically synced to Google Calendar
   - Event status updated to "scheduled"
   - User can manage events in dashboard

## Key Implementation Details

### Event Extraction Pipeline

```
Email → Reader → Filter → NLP Analysis → Event Detection → Calendar Sync
```

1. **Email Reader** - Fetches unread emails from configured addresses
2. **Spam Filter** - Removes spam/irrelevant messages
3. **Classifier** - Checks if email contains event-related content
4. **NLP Pipeline**:
   - Entity extraction (location, attendees)
   - Time parsing (date, time, duration)
   - Confidence scoring
5. **User Review** - Shows pending events for confirmation
6. **Calendar Integration** - Syncs to Google Calendar

### Confidence Scoring

Events are scored 0-1 based on:
- Presence of date/time information (0.2 boost)
- Presence of location (0.15 boost)
- Event keyword frequency (0.05 per keyword, max 0.15)
- Base confidence for event detection (0.5)

### Security Features

- JWT authentication for API endpoints
- Protected routes requiring authentication
- Google OAuth 2.0 for calendar access
- Email validation before adding to monitoring
- Environment variable secrets management

## Testing

### Backend API Testing
Use Postman or similar tool with endpoints listed above.
- Ensure user is authenticated (JWT token required)
- Test email CRUD operations
- Test event confirmation workflow

### Frontend Testing
- Test email addition/removal
- Test event confirmation flow
- Test dashboard filtering

## Future Enhancements

1. **Smart Scheduling**
   - Machine learning to learn user preferences
   - Automatic conflict resolution
   - Timezone handling

2. **Additional Services**
   - Slack integration for notifications
   - Email reply generation
   - Meeting room availability checking

3. **Advanced NLP**
   - Better attendee extraction
   - Duration inference from email patterns
   - Context understanding

4. **Performance**
   - Batch processing for multiple emails
   - Caching of frequently accessed data
   - Background job processing (Bull/Celery)

## Troubleshooting

### Gmail API Issues
- Ensure `oauth_config.json` has correct credentials
- Check API quotas in Google Cloud Console
- Verify scopes include `gmail.readonly` and `calendar`

### NLP Issues
- Ensure spaCy model is installed: `python -m spacy download en_core_web_sm`
- Check dateparser and other dependencies

### Connection Issues
- Verify MongoDB is running
- Check port availability (5000 for backend, 5173 for frontend)
- Verify API base URL in frontend config

## File Structure

```
backend/
├── app/
│   ├── config/
│   ├── controllers/
│   ├── email_module/
│   ├── nlp_module/
│   ├── middlewares/
│   └── models/
├── routes/
├── utils/
└── server.js

frontend/
├── src/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── services/
│   └── App.jsx

ml_models/
├── app/
│   ├── calendar_module/
│   ├── config/
│   ├── email_module/
│   └── nlp_module/
```

## API Response Examples

### Add Email
```json
POST /api/email/connected-emails
{
  "email": "work@company.com"
}

Response:
{
  "success": true,
  "message": "Email connected successfully",
  "connectedEmails": [
    {
      "_id": "...",
      "email": "work@company.com",
      "isActive": true,
      "addedAt": "2024-03-28T10:30:00Z"
    }
  ]
}
```

### Get Events
```json
GET /api/events

Response:
{
  "success": true,
  "count": 3,
  "events": [
    {
      "_id": "...",
      "title": "Team Meeting",
      "dateTime": "2024-03-28T14:00:00Z",
      "location": "Conference Room A",
      "status": "pending",
      "confidence": 0.92
    }
  ]
}
```

## Support & Maintenance

For issues or questions:
1. Check existing documentation in `/docs`
2. Review error logs from both backend and frontend
3. Verify all dependencies are installed correctly
4. Check MongoDB connection status

## License

This project is built as an educational platform for intelligent email-based event management.
