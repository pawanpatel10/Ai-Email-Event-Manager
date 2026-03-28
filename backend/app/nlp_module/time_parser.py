import dateparser
import re
from datetime import datetime, timedelta
from dateparser.search import search_dates

def preprocess_time_phrases(text):

    text = text.lower()

    replacements = {
        "after lunch": "2 pm",
        "before lunch": "11 am",
        "morning": "9 am",
        "afternoon": "2 pm",
        "evening": "6 pm",
        "tonight": "8 pm",
        "eod": "5 pm"
    }

    for phrase, replacement in replacements.items():
        text = text.replace(phrase, replacement)

    return text


def extract_datetime(text):

    text = preprocess_time_phrases(text)

    parsed_matches = search_dates(
        text,
        languages=["en"],
        settings={
            "PREFER_DATES_FROM": "future"
        }
    )

    parsed = parsed_matches[0][1] if parsed_matches else dateparser.parse(
        text,
        settings={
            "PREFER_DATES_FROM": "future"
        }
    )

    if parsed:
        return parsed.date(), parsed.time()

    return None, None


def extract_duration(text):

    lowered = preprocess_time_phrases(text)

    match = re.search(
        r"\bfor\s+(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\b",
        lowered,
    )

    if not match:
        return None

    value = float(match.group(1))
    unit = match.group(2)

    if "hour" in unit or "hr" in unit:
        return int(value * 60)

    return int(value)


def extract_end_time(text):

    lowered = preprocess_time_phrases(text)

    match = re.search(
        r"\b(?:to|until|till)\s+([0-9]{1,2}(?::[0-9]{2})?\s*(?:am|pm)?)\b",
        lowered,
    )

    if not match:
        return None

    parsed = dateparser.parse(match.group(1))
    if parsed:
        return parsed.time()

    return None


def extract_time_details(text):

    date_value, time_value = extract_datetime(text)
    duration_minutes = extract_duration(text)
    end_time_value = extract_end_time(text)

    # If end time is not explicit but duration is available, infer end time.
    if end_time_value is None and time_value is not None and duration_minutes is not None:
        start_dt = datetime.combine(datetime.today().date(), time_value)
        end_dt = start_dt + timedelta(minutes=duration_minutes)
        end_time_value = end_dt.time()

    return date_value, time_value, duration_minutes, end_time_value