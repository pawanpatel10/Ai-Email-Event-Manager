from nlp_pipeline import process_email

email = """
Meeting is scheduled at 5 PM in room 300.
"""

result = process_email(email)

print(result)