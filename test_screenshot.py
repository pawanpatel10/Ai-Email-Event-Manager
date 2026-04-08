from backend.app.nlp_module.nlp_pipeline import NLPPipeline
import json

email = """
Date : April 20, 2026
Time : 17 : 00
Location : MNNIT
"""

pipeline = NLPPipeline()
print(json.dumps(pipeline.extract_event_information(email), indent=2, default=str))
