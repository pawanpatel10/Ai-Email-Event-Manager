import dateparser
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