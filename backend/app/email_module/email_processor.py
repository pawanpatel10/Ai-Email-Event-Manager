"""
Email Processing Pipeline
This module orchestrates the complete email processing workflow:
1. Fetch emails from configured addresses
2. Analyze email content to detect events
3. Extract event details (date, time, location, title)
4. Create events in Google Calendar
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from email_reader import GmailEmailReader
from email_filters import filter_spam_emails, contains_event_keyword
from email_utils import extract_email_domain, extract_email_address


class EmailProcessor:
    """Process emails and extract event information"""
    
    def __init__(self, gmail_credentials=None, nlp_pipeline=None):
        """
        Initialize email processor
        
        Args:
            gmail_credentials: Google OAuth credentials
            nlp_pipeline: NLP pipeline for event extraction
        """
        self.email_reader = GmailEmailReader(gmail_credentials)
        self.nlp_pipeline = nlp_pipeline
    
    def process_emails_from_addresses(self, email_addresses, user_id=None):
        """
        Process emails from specified addresses
        
        Args:
            email_addresses: List of email addresses to monitor
            user_id: User ID for tracking
            
        Returns:
            List of detected events
        """
        events = []
        
        # Get unread emails from specified addresses
        unread_emails = self.email_reader.get_unread_emails(
            from_addresses=email_addresses,
            max_results=20
        )
        
        for email in unread_emails:
            # Skip spam/filtered emails
            if filter_spam_emails(email['subject']):
                self.email_reader.mark_as_spam(email['id'])
                continue
            
            # Check if email might contain event
            if not contains_event_keyword(email['subject'], email['body']):
                self.email_reader.mark_as_read(email['id'])
                continue
            
            # Extract event information using NLP
            event_data = self._extract_event_data(email)
            
            if event_data:
                event_data['email_id'] = email['id']
                event_data['from_email'] = email['from']
                event_data['user_id'] = user_id
                events.append(event_data)
        
        return events
    
    def _extract_event_data(self, email):
        """
        Extract event information from email using NLP
        
        Args:
            email: Email dictionary with subject, body, etc.
            
        Returns:
            Event data dictionary or None
        """
        if not self.nlp_pipeline:
            return None
        
        # Combine subject and body for analysis
        text = f"{email['subject']} {email['body']}"
        
        try:
            # Use NLP pipeline to extract event information
            event_data = self.nlp_pipeline.extract_event_information(text)
            return event_data
        except Exception as e:
            print(f"Error extracting event data: {e}")
            return None
    
    def process_single_email(self, message_id):
        """
        Process a single email
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            Event data or None
        """
        email = self.email_reader.get_email_details(message_id)
        
        if not email:
            return None
        
        # Skip spam
        if filter_spam_emails(email['subject']):
            return None
        
        # Check for event keywords
        if not contains_event_keyword(email['subject'], email['body']):
            return None
        
        return self._extract_event_data(email)
    
    def update_gmail_credentials(self, credentials):
        """Update Gmail credentials"""
        self.email_reader.set_credentials(credentials)
    
    def update_nlp_pipeline(self, nlp_pipeline):
        """Update NLP pipeline"""
        self.nlp_pipeline = nlp_pipeline
    
    def fetch_all_unread_emails(self):
        """Get all unread emails"""
        return self.email_reader.get_unread_emails()
    
    def fetch_emails_from_sender(self, sender_email, max_results=10):
        """Get emails from specific sender"""
        return self.email_reader.get_emails_from_sender(sender_email, max_results)
