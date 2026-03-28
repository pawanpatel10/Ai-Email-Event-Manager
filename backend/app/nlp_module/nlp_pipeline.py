try:
    from event_classifier import is_event_email
    from time_parser import extract_time_details
    from entity_extractor import extract_location, extract_description
    from confidence_engine import calculate_confidence
except ModuleNotFoundError:
    from event_classifier import is_event_email
    from time_parser import extract_time_details
    from entity_extractor import extract_location, extract_description
    from confidence_engine import calculate_confidence


def process_email(text):

    if not is_event_email(text):
        return {"event": False}

    event_context = extract_description(text).strip()

    date, time, duration, end_time = extract_time_details(text)

    location = extract_location(text)

    confidence = calculate_confidence(date, time, location)

    result = {
        "event": True,
        "date": str(date),
        "time": str(time),
        "duration": duration,
        "end_time": str(end_time) if end_time else None,
        "location": location,
        "event_context": event_context,
        "confidence": confidence
    }

    return result