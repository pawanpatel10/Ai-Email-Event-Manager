# List of allowed senders
ALLOWED_SENDERS = [
    "abc@gmail.com",
    "xyz@gmail.com"
]


def build_query(unread_only=True, recent_days=None):
    """
    Builds Gmail query string
    """

    query_parts = []

    # Filter by senders
    if ALLOWED_SENDERS:
        sender_query = " OR ".join(ALLOWED_SENDERS)
        query_parts.append(f"from:({sender_query})")

    # Filter unread emails
    if unread_only:
        query_parts.append("is:unread")

    # Filter recent emails (optional)
    if recent_days:
        query_parts.append(f"newer_than:{recent_days}d")

    return " ".join(query_parts)