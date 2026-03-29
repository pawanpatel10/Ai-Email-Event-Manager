"""
NLP Pipeline for Event Extraction
Combines event classification, entity extraction, and time parsing
"""

try:
    from event_classifier import is_event_email
    from time_parser import extract_time_details
    from entity_extractor import extract_location, extract_description
    from confidence_engine import calculate_confidence
except ModuleNotFoundError:
    from event_classifier import is_event_email

import spacy
import re

try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    nlp = None


class NLPPipeline:
    """Complete NLP pipeline for event extraction from text"""
    
    def __init__(self):
        """Initialize NLP pipeline"""
        self.nlp_model = nlp
    
    def extract_event_information(self, text):
        """
        Extract event information from text
        
        Args:
            text: Email subject/body text
            
        Returns:
            Dictionary with extracted event data or None if not an event
        """
        # Check if text contains event
        if not is_event_email(text):
            return None
        
        # Extract key information
        title = self._extract_title(text)
        location = extract_location(text)
        description = extract_description(text)
        
        time_details = extract_time_details(text)
        date_value = time_details[0] if len(time_details) > 0 else None
        time_value = time_details[1] if len(time_details) > 1 else None
        duration = time_details[2] if len(time_details) > 2 else None
        
        # Extract attendees
        attendees = self._extract_emails(text)
        
        # Build event data
        event_data = {
            'title': title,
            'description': description,
            'location': location,
            'date': date_value,
            'time': time_value,
            'duration': duration,
            'attendees': attendees,
            'confidence': self._calculate_confidence(text, title, date_value, location),
        }
        
        return event_data
    
    def _extract_title(self, text):
        """
        Extract event title from text
        
        Args:
            text: Email text
            
        Returns:
            Event title
        """
        # Try to get from first sentence or subject
        sentences = text.split('.')
        if sentences:
            return sentences[0][:100]  # Limit to 100 chars
        return "Event"
    
    def _extract_emails(self, text):
        """
        Extract email addresses from text
        
        Args:
            text: Email text
            
        Returns:
            List of email addresses found
        """
        emails = []
        
        # Use regex to find emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        found_emails = re.findall(email_pattern, text)
        
        emails = list(set(found_emails))
        return emails
    
    def _calculate_confidence(self, text, title, date_value, location):
        """
        Calculate confidence score for event extraction
        
        Args:
            text: Original text
            title: Extracted title
            date_value: Extracted date
            location: Extracted location
            
        Returns:
            Confidence score (0-1)
        """
        confidence = 0.5  # Base confidence for event detection
        
        # Boost if date found
        if date_value:
            confidence += 0.2
        
        # Boost if location found
        if location:
            confidence += 0.15
        
        # Boost if text contains specific event keywords
        event_keywords = ['meeting', 'schedule', 'appointment', 'call', 'discussion',
                         'session', 'demo', 'presentation', 'interview', 'review',
                         'deadline', 'submit', 'due', 'delivery']
        keyword_count = sum(1 for kw in event_keywords if kw.lower() in text.lower())
        
        if keyword_count > 0:
            confidence += min(0.15, keyword_count * 0.05)
        
        # Ensure confidence stays between 0 and 1
        confidence = min(1.0, max(0.0, confidence))
        
        return round(confidence, 2)


# Legacy function for backward compatibility
def process_email(text):
    """Process email text and extract event information"""
    if not is_event_email(text):
        return {"event": False}

    event_context = extract_description(text).strip()

    time_details = extract_time_details(text)
    date = time_details[0] if len(time_details) > 0 else None
    time = time_details[1] if len(time_details) > 1 else None
    duration = time_details[2] if len(time_details) > 2 else None
    end_time = time_details[3] if len(time_details) > 3 else None

    location = extract_location(text)

    confidence = calculate_confidence(date, time, location) if 'calculate_confidence' in dir() else 0.5

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