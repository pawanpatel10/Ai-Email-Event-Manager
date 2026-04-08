from nlp_pipeline import NLPPipeline
import json

def test_nlp():
    pipeline = NLPPipeline()
    
    emails = [
        "Meeting is scheduled at 5 PM in room 300.",
        "Just a reminder for our weekly sync tomorrow! We will be meeting in the conference room. Please don't be late. Attendance is mandatory.",
        "Your dental appointment has been rescheduled to next tuesday.",
        "Hey, do you want to grab lunch?"
    ]
    
    for i, email in enumerate(emails):
        print(f"--- Test Case {i+1} ---")
        print(f"Text: '{email}'")
        result = pipeline.extract_event_information(email)
        print("Result:", json.dumps(result, indent=2, default=str) if result else "None")
        print()

if __name__ == '__main__':
    test_nlp()