import spacy

nlp = spacy.load("en_core_web_sm")

def extract_location(text):

    doc = nlp(text)

    for ent in doc.ents:
        if ent.label_ in ["GPE", "LOC", "FAC"]:
            return ent.text

    return None

def extract_description(text):

    sentences = text.split(".")
    return sentences[0]