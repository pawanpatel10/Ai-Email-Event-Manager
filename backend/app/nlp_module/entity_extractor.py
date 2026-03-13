import spacy

try:
    nlp = spacy.load("en_core_web_sm")
except OSError as exc:
    raise RuntimeError(
        "spaCy model 'en_core_web_sm' is not installed. Run 'python -m spacy download en_core_web_sm' in your active virtual environment and try again."
    ) from exc

def extract_location(text):

    doc = nlp(text)

    for ent in doc.ents:
        if ent.label_ in ["GPE", "LOC", "FAC"]:
            return ent.text

    return None

def extract_description(text):

    sentences = text.split(".")
    return sentences[0]