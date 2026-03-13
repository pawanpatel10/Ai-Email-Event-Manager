from app.nlp_module.nlp_pipeline import process_email

def test_event_detection():
    email = "Meeting tomorrow at 3 PM in Room 201"
    result = process_email(email)

    assert result["event"] == True