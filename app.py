from fastapi import FastAPI, HTTPException
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List
from huggingface_hub import hf_hub_download
import fasttext
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.mount("/static", StaticFiles(directory=".", html=True), name="static")

@app.get("/")
async def read_root():
    return RedirectResponse(url="/static/index.html")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Replace "*" with specific origins like ["http://127.0.0.1:8080"] for better security
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Load the FastText language identification model
ft_model_path = hf_hub_download("facebook/fasttext-language-identification", "model.bin")
ft_model = fasttext.load_model(ft_model_path)

# Load the Tagalog hate speech detection model
tl_tokenizer = AutoTokenizer.from_pretrained("ggpt1006/tl-hate-bert")
tl_model = AutoModelForSequenceClassification.from_pretrained("ggpt1006/tl-hate-bert")

# Load the English hate speech detection model
en_tokenizer = AutoTokenizer.from_pretrained("Hate-speech-CNERG/dehatebert-mono-english")
en_model = AutoModelForSequenceClassification.from_pretrained("Hate-speech-CNERG/dehatebert-mono-english")

# Define the response models
class Prediction(BaseModel):
    label: str
    score: float

class TextInput(BaseModel):
    text: str

@app.post("/predict-language", response_model=List[Prediction])
async def predict_language(input_data: TextInput) -> List[Prediction]:
    # Get top 5 language predictions
    predictions = ft_model.predict(input_data.text, k=5)
    languages = predictions[0]  # labels
    confidences = predictions[1]  # scores

    # Format output as a flat list of dictionaries
    result = [
        {"label": lang.replace("__label__", ""), "score": score} 
        for lang, score in zip(languages, confidences)
    ]
    return result

@app.post("/predict-tagalog", response_model=List[Prediction])
async def predict_tagalog(input_data: TextInput) -> List[Prediction]:
    inputs = tl_tokenizer(input_data.text, return_tensors="pt")
    outputs = tl_model(**inputs)
    logits = outputs.logits
    probabilities = torch.softmax(logits, dim=1).tolist()[0]

    # Map the model outputs to labels
    result = [
        {"label": f"LABEL_{i}", "score": score}
        for i, score in enumerate(probabilities)
    ]
    return result

@app.post("/predict-english", response_model=List[Prediction])
async def predict_english(input_data: TextInput) -> List[Prediction]:
    inputs = en_tokenizer(input_data.text, return_tensors="pt")
    outputs = en_model(**inputs)
    logits = outputs.logits
    probabilities = torch.softmax(logits, dim=1).tolist()[0]

    # Define custom labels for the English hate speech model
    labels = ["NON_HATE", "HATE"]

    # Map the model outputs to labels in a flat list
    result = [
        {"label": label, "score": score} for label, score in zip(labels, probabilities)
    ]
    return result
