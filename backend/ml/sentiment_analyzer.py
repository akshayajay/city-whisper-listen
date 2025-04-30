
import os
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
import torch

class SentimentAnalyzer:
    def __init__(self):
        # Check if we should use mock data (for development without GPU)
        self.use_mock_data = os.getenv("USE_MOCK_ML", "false").lower() == "true"
        
        if not self.use_mock_data:
            try:
                # Load multilingual sentiment analysis model (supports Tamil and English)
                model_name = "nlptown/bert-base-multilingual-uncased-sentiment"
                
                # Load model and tokenizer
                self.tokenizer = AutoTokenizer.from_pretrained(model_name)
                self.model = AutoModelForSequenceClassification.from_pretrained(model_name)
                
                # Create sentiment analysis pipeline
                self.sentiment_pipeline = pipeline(
                    "sentiment-analysis", 
                    model=self.model, 
                    tokenizer=self.tokenizer,
                    device=0 if torch.cuda.is_available() else -1  # Use GPU if available
                )
                
                print("Sentiment analysis model loaded successfully")
            except Exception as e:
                print(f"Error loading sentiment analysis model: {e}")
                self.use_mock_data = True
                print("Falling back to mock sentiment analysis")
        else:
            print("Using mock sentiment analysis")
    
    def analyze(self, text: str) -> str:
        """
        Analyze the sentiment of the given text
        Returns: "positive", "neutral", or "negative"
        """
        if self.use_mock_data:
            return self._mock_analyze(text)
        
        try:
            # Run text through sentiment analysis pipeline
            result = self.sentiment_pipeline(text)[0]
            score = result['score']
            label = result['label']
            
            # Convert 5-class sentiment to 3-class
            if "1 star" in label or "2 stars" in label:
                return "negative"
            elif "3 stars" in label:
                return "neutral"
            else:  # 4 or 5 stars
                return "positive"
        except Exception as e:
            print(f"Error analyzing sentiment: {e}")
            return self._mock_analyze(text)
    
    def _mock_analyze(self, text: str) -> str:
        """
        Simple rule-based sentiment analysis for development
        without requiring the full ML model
        """
        text = text.lower()
        
        # Lists of positive and negative words
        positive_words = [
            "good", "great", "excellent", "amazing", "wonderful", "fantastic",
            "love", "happy", "thank", "thanks", "improved", "better", "best",
            "fixed", "resolved", "solution", "solve", "solved"
        ]
        
        negative_words = [
            "bad", "terrible", "horrible", "awful", "poor", "worst",
            "hate", "issue", "problem", "broken", "damage", "damaged",
            "not working", "doesn't work", "fail", "failed", "failure",
            "complaint", "complain", "disappointed", "disappointing"
        ]
        
        # Count matches
        positive_count = sum(1 for word in positive_words if word in text)
        negative_count = sum(1 for word in negative_words if word in text)
        
        # Determine sentiment
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        else:
            return "neutral"
