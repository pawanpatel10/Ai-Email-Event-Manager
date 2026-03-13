event_keywords = [
    "meeting",
    "schedule",
    "appointment",
    "call",
    "discussion",
    "session",
    "meet",
    "demo",
    "presentation",
    "interview",
    "review",
    "deadline",
    "submit",
    "submission",
    "due",
    "report",
    "delivery"
]


def is_event_email(text):
    text = text.lower()

    for word in event_keywords:
        if word in text:
            return True

    return False