from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.oauth2.credentials import Credentials
import os
import pickle

# If modifying these scopes, delete token.pkl
SCOPES = ['https://www.googleapis.com/auth/gmail.readonly']


def get_service():
    creds = None

    # Token file stores user's access & refresh tokens
    if os.path.exists('token.pkl'):
        with open('token.pkl', 'rb') as token:
            creds = pickle.load(token)

    # If no valid credentials, login again
    if not creds or not creds.valid:
        flow = InstalledAppFlow.from_client_secrets_file(
            'backend/app/config/oauth_config.json', SCOPES
        )
        creds = flow.run_local_server(port=0)

        # Save credentials
        with open('token.pkl', 'wb') as token:
            pickle.dump(creds, token)

    # Build Gmail service
    service = build('gmail', 'v1', credentials=creds)

    return service