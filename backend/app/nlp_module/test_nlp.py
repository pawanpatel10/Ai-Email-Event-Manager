from nlp_pipeline import process_email

email = """
Submit the report EOD.
"""

result = process_email(email)

print(result)