from nlp_pipeline import process_email

email = """
Project discussion tomorrow evening in Lab 2.
"""

result = process_email(email)

print(result)