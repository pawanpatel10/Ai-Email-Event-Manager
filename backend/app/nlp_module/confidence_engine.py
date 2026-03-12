def calculate_confidence(date, time, location):

    confidence = 0

    if date:
        confidence += 0.4

    if time:
        confidence += 0.4

    if location:
        confidence += 0.2

    return confidence