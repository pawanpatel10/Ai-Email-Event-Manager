event_keywords = [
    # General scheduling
    "meeting", "schedule", "scheduled", "reschedule", "rescheduled", "appointment",
    "call", "conference call", "zoom call", "google meet", "teams meeting",
    "discussion", "session", "meet", "meetup", "sync", "catch-up",
    "check-in", "standup", "daily standup", "weekly sync", "1:1", "one-on-one",

    # Invitations
    "invitation", "invite", "invited", "you're invited", "please join",
    "join us", "attend", "attendance", "rsvp", "kindly attend",

    # Time related
    "tomorrow", "today", "tonight", "this evening", "this morning",
    "next week", "next monday", "next tuesday", "next friday",
    "at", "on", "by", "before", "after", "within", "deadline approaching",

    # Deadlines / submissions
    "deadline", "submit", "submission", "due", "due date", "last date",
    "final date", "closing date", "cutoff", "cut-off", "expiry",
    "expires", "expiring", "overdue", "pending submission",

    # Work / office events
    "review", "performance review", "code review", "design review",
    "demo", "presentation", "project presentation", "walkthrough",
    "briefing", "debrief", "kickoff", "kick-off", "launch meeting",
    "planning meeting", "strategy meeting",

    # Academic
    "exam", "test", "quiz", "midterm", "final exam",
    "assignment", "project submission", "lab", "lab session",
    "seminar", "workshop", "lecture", "class", "tutorial",

    # Hiring / interviews
    "interview", "technical interview", "hr interview",
    "screening", "assessment", "online test", "coding test",
    "interview schedule", "interview slot",

    # Events / functions
    "event", "function", "ceremony", "celebration",
    "webinar", "conference", "summit", "expo", "hackathon",
    "competition", "contest", "bootcamp",

    # Reminders
    "reminder", "gentle reminder", "friendly reminder",
    "just a reminder", "this is a reminder",

    # Travel / bookings
    "flight", "departure", "arrival", "boarding",
    "check-in", "hotel booking", "reservation", "itinerary",

    # Calendar related
    "calendar invite", "calendar event", "blocked your calendar",
    "schedule attached", "added to calendar",

    # Urgency indicators
    "urgent", "important", "action required",
    "immediate attention", "asap",

    # Task-related
    "task", "action item", "to-do", "follow-up",
    "next steps", "pending action", "required action",

    # Delivery / logistics
    "delivery", "dispatch", "pickup", "shipment",
    "delivery schedule",

    # Notifications
    "notification", "alert", "update", "announcement",
    "notice", "circular",

    # Business processes
    "milestone", "phase completion", "progress meeting",
    "sprint planning", "retrospective", "scrum meeting",

    # Collaboration
    "collaboration", "discussion point", "agenda",
    "meeting agenda", "points to discuss",

    # Time blocks
    "time slot", "slot", "availability", "available at",
    "free at", "schedule a time",

    # Requests
    "request meeting", "schedule a call",
    "let's connect", "can we meet", "can we schedule",

    # Confirmations
    "confirmation", "confirmed", "please confirm",
    "kindly confirm", "confirmation required",

    # Follow-ups
    "follow up meeting", "follow-up call",
    "checking in", "circling back",

    # Notifications of change
    "postponed", "cancelled", "canceled",
    "moved to", "changed schedule",

    # Recurring
    "recurring meeting", "weekly meeting",
    "monthly meeting", "daily sync",

    # Misc useful triggers
    "join link", "meeting link", "zoom link",
    "attached agenda", "attached schedule",
    "see details below", "details enclosed",

    # Formal phrases
    "we would like to invite", "you are requested to attend",
    "please be present", "your presence is required",
    "kindly join", "scheduled as follows",

    # Informal phrases
    "let’s meet", "let’s catch up", "ping me",
    "connect soon", "sync up",

    # Extended realistic phrases
    "block your time", "reserve your slot",
    "mark your calendar", "calendar blocked",
    "save the date", "event scheduled",
    "session starts", "session ends",
    "starting at", "ending at",

    # Extra variations
    "meet-up", "e-meeting", "virtual meeting",
    "in-person meeting", "office meeting",

    # Additional triggers
    "team meeting", "client meeting",
    "internal meeting", "external meeting",
    "board meeting", "committee meeting",

    # Edge cases
    "hearing", "appointment confirmed",
    "doctor appointment", "consultation",
    "visit scheduled", "inspection",

    # More deadline variations
    "submission deadline", "apply before",
    "last day to apply", "apply by",

    # Even more
    "presentation scheduled", "demo scheduled",
    "interview confirmed", "exam scheduled",
    "meeting scheduled", "session scheduled"
]

def is_event_email(text):
    text = text.lower()

    for word in event_keywords:
        if word in text:
            return True

    return False