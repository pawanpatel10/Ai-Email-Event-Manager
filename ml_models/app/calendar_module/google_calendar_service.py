from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from datetime import datetime, timedelta
import os


class GoogleCalendarService:
    def __init__(self, credentials=None):
        """
        Initialize Google Calendar Service
        
        Args:
            credentials: Google OAuth credentials object
        """
        self.credentials = credentials
        if credentials:
            self.service = build('calendar', 'v3', credentials=credentials)
        else:
            self.service = None

    def set_credentials(self, credentials):
        """Update credentials"""
        self.credentials = credentials
        self.service = build('calendar', 'v3', credentials=credentials)

    def list_calendars(self):
        """List all calendars"""
        try:
            calendars = self.service.calendarList().list().execute()
            return calendars.get('items', [])
        except HttpError as error:
            print(f'An error occurred: {error}')
            return []

    def get_primary_calendar(self):
        """Get primary calendar ID"""
        try:
            calendar = self.service.calendarList().get(calendarId='primary').execute()
            return calendar.get('id')
        except HttpError as error:
            print(f'An error occurred: {error}')
            return 'primary'

    def create_event(self, title, start_time, end_time=None, description=None, 
                    location=None, timezone='UTC'):
        """
        Create a calendar event
        
        Args:
            title: Event title
            start_time: Start datetime (datetime object)
            end_time: End datetime (datetime object)
            description: Event description
            location: Event location
            timezone: Timezone for the event
            
        Returns:
            Event object or None if error
        """
        try:
            if not self.service:
                return None

            # If end_time not provided, default to 1 hour after start
            if end_time is None:
                end_time = start_time + timedelta(hours=1)

            event = {
                'summary': title,
                'start': {
                    'dateTime': start_time.isoformat(),
                    'timeZone': timezone,
                },
                'end': {
                    'dateTime': end_time.isoformat(),
                    'timeZone': timezone,
                },
            }

            if description:
                event['description'] = description

            if location:
                event['location'] = location

            # Create event on primary calendar
            created_event = self.service.events().insert(
                calendarId='primary',
                body=event
            ).execute()

            return created_event

        except HttpError as error:
            print(f'An error occurred: {error}')
            return None

    def update_event(self, event_id, title=None, start_time=None, end_time=None,
                    description=None, location=None, timezone='UTC'):
        """
        Update an existing calendar event
        
        Args:
            event_id: Calendar event ID
            title: Event title
            start_time: Start datetime
            end_time: End datetime
            description: Event description
            location: Event location
            timezone: Timezone for the event
            
        Returns:
            Updated event object or None if error
        """
        try:
            if not self.service:
                return None

            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()

            if title:
                event['summary'] = title
            if description:
                event['description'] = description
            if location:
                event['location'] = location
            if start_time:
                event['start'] = {
                    'dateTime': start_time.isoformat(),
                    'timeZone': timezone,
                }
            if end_time:
                event['end'] = {
                    'dateTime': end_time.isoformat(),
                    'timeZone': timezone,
                }

            updated_event = self.service.events().update(
                calendarId='primary',
                eventId=event_id,
                body=event
            ).execute()

            return updated_event

        except HttpError as error:
            print(f'An error occurred: {error}')
            return None

    def delete_event(self, event_id):
        """
        Delete a calendar event
        
        Args:
            event_id: Calendar event ID
            
        Returns:
            True if successful, False otherwise
        """
        try:
            if not self.service:
                return False

            self.service.events().delete(
                calendarId='primary',
                eventId=event_id
            ).execute()

            return True

        except HttpError as error:
            print(f'An error occurred: {error}')
            return False

    def get_event(self, event_id):
        """
        Get event details
        
        Args:
            event_id: Calendar event ID
            
        Returns:
            Event object or None
        """
        try:
            if not self.service:
                return None

            event = self.service.events().get(
                calendarId='primary',
                eventId=event_id
            ).execute()

            return event

        except HttpError as error:
            print(f'An error occurred: {error}')
            return None

    def search_events(self, query, start_time=None, end_time=None):
        """
        Search for events
        
        Args:
            query: Search query
            start_time: Optional start datetime
            end_time: Optional end datetime
            
        Returns:
            List of matching events
        """
        try:
            if not self.service:
                return []

            search_params = {
                'calendarId': 'primary',
                'q': query,
            }

            if start_time:
                search_params['timeMin'] = start_time.isoformat()
            if end_time:
                search_params['timeMax'] = end_time.isoformat()

            results = self.service.events().list(**search_params).execute()
            return results.get('items', [])

        except HttpError as error:
            print(f'An error occurred: {error}')
            return []

    def get_free_busy(self, start_time, end_time):
        """
        Check user's free/busy status
        
        Args:
            start_time: Start datetime
            end_time: End datetime
            
        Returns:
            Free/busy information or None
        """
        try:
            if not self.service:
                return None

            body = {
                'items': [{'id': 'primary'}],
                'timeMin': start_time.isoformat(),
                'timeMax': end_time.isoformat(),
            }

            result = self.service.freebusy().query(body=body).execute()
            return result.get('calendars', {}).get('primary', {})

        except HttpError as error:
            print(f'An error occurred: {error}')
            return None
