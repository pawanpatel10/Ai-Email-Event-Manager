try:
    from entity_extractor import extract_location, extract_description
    from backend.app.nlp_module.event_classifier import is_event_email
    from backend.app.nlp_module.time_parser import extract_datetime
    from backend.app.nlp_module.entity_extractor import extract_location
    from backend.app.nlp_module.confidence_engine import calculate_confidence
except ModuleNotFoundError:
    from event_classifier import is_event_email
    from time_parser import extract_datetime
    from entity_extractor import extract_location
    from confidence_engine import calculate_confidence


def process_email(text):

    if not is_event_email(text):
        return {"event": False}
    description = extract_description(text)
    
    date, time = extract_datetime(text)

    location = extract_location(text)

    confidence = calculate_confidence(date, time, location)

    result = {
        "event": True,
        "date": str(date),
        "time": str(time),
        "location": location,
        "confidence": confidence
    }

    return result