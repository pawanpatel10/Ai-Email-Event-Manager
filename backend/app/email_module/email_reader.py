from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import base64
from email.mime.text import MIMEText
from datetime import datetime
import re


class GmailEmailReader:
    """
    Gmail email reader to fetch and parse emails
    """
    
    def __init__(self, credentials=None):
        """
        Initialize Gmail reader
        
        Args:
            credentials: Google OAuth credentials object
        """
        self.credentials = credentials
        if credentials:
            self.service = build('gmail', 'v1', credentials=credentials)
        else:
            self.service = None

    def set_credentials(self, credentials):
        """Update credentials"""
        self.credentials = credentials
        self.service = build('gmail', 'v1', credentials=credentials)

    def get_email_list(self, query='is:unread', max_results=10):
        """
        Get list of emails matching query
        
        Args:
            query: Gmail query string (e.g., 'is:unread', 'from:example@gmail.com')
            max_results: Maximum number of results to return
            
        Returns:
            List of email message IDs
        """
        try:
            if not self.service:
                return []

            results = self.service.users().messages().list(
                userId='me',
                q=query,
                maxResults=max_results
            ).execute()

            messages = results.get('messages', [])
            return messages

        except HttpError as error:
            print(f'An error occurred: {error}')
            return []

    def get_email_details(self, message_id):
        """
        Get full email details
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            Dictionary with email details
        """
        try:
            if not self.service:
                return None

            message = self.service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()

            headers = message['payload'].get('headers', [])
            subject = next((h['value'] for h in headers if h['name'] == 'Subject'), 'No Subject')
            from_email = next((h['value'] for h in headers if h['name'] == 'From'), 'Unknown')
            to_email = next((h['value'] for h in headers if h['name'] == 'To'), '')
            date_str = next((h['value'] for h in headers if h['name'] == 'Date'), '')

            # Parse date
            received_date = self._parse_email_date(date_str)

            # Extract body
            body = self._extract_email_body(message['payload'])

            return {
                'id': message_id,
                'subject': subject,
                'from': from_email,
                'to': to_email,
                'date': received_date,
                'body': body,
                'labels': message.get('labelIds', []),
                'threadId': message.get('threadId', ''),
            }

        except HttpError as error:
            print(f'An error occurred: {error}')
            return None

    def get_emails_from_sender(self, sender_email, max_results=10):
        """
        Get emails from a specific sender
        
        Args:
            sender_email: Sender email address
            max_results: Maximum number of results
            
        Returns:
            List of email objects
        """
        query = f'from:{sender_email} is:unread'
        messages = self.get_email_list(query=query, max_results=max_results)
        
        emails = []
        for msg in messages:
            email_details = self.get_email_details(msg['id'])
            if email_details:
                emails.append(email_details)
        
        return emails

    def mark_as_read(self, message_id):
        """
        Mark email as read
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.service:
                return False

            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'removeLabelIds': ['UNREAD']}
            ).execute()

            return True

        except HttpError as error:
            print(f'An error occurred: {error}')
            return False

    def mark_as_spam(self, message_id):
        """
        Mark email as spam
        
        Args:
            message_id: Gmail message ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.service:
                return False

            self.service.users().messages().modify(
                userId='me',
                id=message_id,
                body={'addLabelIds': ['SPAM']}
            ).execute()

            return True

        except HttpError as error:
            print(f'An error occurred: {error}')
            return False

    def get_attachment(self, message_id, attachment_id):
        """
        Get email attachment
        
        Args:
            message_id: Gmail message ID
            attachment_id: Attachment ID
            
        Returns:
            Attachment data
        """
        try:
            if not self.service:
                return None

            attachment = self.service.users().messages().attachments().get(
                userId='me',
                messageId=message_id,
                id=attachment_id
            ).execute()

            return attachment

        except HttpError as error:
            print(f'An error occurred: {error}')
            return None

    @staticmethod
    def _extract_email_body(payload):
        """
        Extract email body from payload
        
        Args:
            payload: Email payload object
            
        Returns:
            Email body text
        """
        if 'parts' in payload:
            parts = payload.get('parts', [])
            data = ''
            for part in parts:
                mimeType = part.get('mimeType')
                if mimeType == 'text/plain':
                    if 'data' in part['body']:
                        data = part['body']['data']
                        break
                elif mimeType == 'text/html':
                    if 'data' in part['body']:
                        data = part['body']['data']
            
            if data:
                text = base64.urlsafe_b64decode(data).decode('utf-8')
                return text
        else:
            if 'body' in payload:
                data = payload['body'].get('data', '')
                if data:
                    text = base64.urlsafe_b64decode(data).decode('utf-8')
                    return text
        
        return ''

    @staticmethod
    def _parse_email_date(date_str):
        """
        Parse email date string to datetime object
        
        Args:
            date_str: Email date string
            
        Returns:
            datetime object or None
        """
        try:
            # Email dates are typically in RFC 2822 format
            # Try to parse common formats
            if not date_str:
                return None
            
            # Remove timezone info for simplicity
            if '(' in date_str:
                date_str = date_str.split('(')[0].strip()
            
            # Try parsing RFC 2822 format
            from email.utils import parsedate_to_datetime
            dt = parsedate_to_datetime(date_str)
            return dt
        except:
            return datetime.now()

    def get_unread_emails(self, from_addresses=None, max_results=10):
        """
        Get all unread emails, optionally from specific addresses
        
        Args:
            from_addresses: List of email addresses to filter by
            max_results: Maximum number of results
            
        Returns:
            List of email objects
        """
        query = 'is:unread'
        
        if from_addresses:
            from_query = ' OR '.join([f'from:{addr}' for addr in from_addresses])
            query = f'{query} ({from_query})'
        
        messages = self.get_email_list(query=query, max_results=max_results)
        
        emails = []
        for msg in messages:
            email_details = self.get_email_details(msg['id'])
            if email_details:
                emails.append(email_details)
        
        return emails
