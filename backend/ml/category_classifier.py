
import os
import random
from typing import Dict, List
import re

class CategoryClassifier:
    def __init__(self):
        # Check if we should use mock data (for development without GPU)
        self.use_mock_data = os.getenv("USE_MOCK_ML", "false").lower() == "true"
        
        if not self.use_mock_data:
            try:
                # In a real implementation, you would load a trained text classification model
                # for the specific categories in Tamil Nadu context
                
                # For example, using transformers:
                # from transformers import pipeline
                # self.classifier = pipeline("text-classification", model="path/to/your/model")
                
                # Since this requires training a custom model, we'll use the mock implementation
                # for this prototype
                self.use_mock_data = True
                print("Using rule-based category classification")
            except Exception as e:
                print(f"Error initializing category classifier: {e}")
                self.use_mock_data = True
        else:
            print("Using rule-based category classification")
        
        # Define category keywords for rule-based classification
        self.category_keywords: Dict[str, List[str]] = {
            "infrastructure": [
                "road", "bridge", "building", "construction", "repair", "broken", "damaged",
                "infrastructure", "facility", "facilities", "street", "sidewalk", "footpath",
                "drainage", "sewage", "pipe", "water supply", "electricity", "power"
            ],
            "waste": [
                "waste", "garbage", "trash", "rubbish", "bin", "collection", "dump", "dumping",
                "clean", "cleaning", "litter", "dispose", "disposal"
            ],
            "transportation": [
                "bus", "train", "metro", "transport", "transportation", "traffic", "vehicle",
                "car", "auto", "rickshaw", "parking", "route", "commute", "travel"
            ],
            "water": [
                "water", "drinking", "supply", "tap", "pipeline", "flood", "flooding",
                "rainwater", "drainage", "sewage", "river", "lake", "pond", "canal"
            ],
            "safety": [
                "safety", "safe", "security", "police", "crime", "accident", "emergency",
                "danger", "dangerous", "unsafe", "light", "lighting", "streetlight"
            ],
            "parks": [
                "park", "garden", "playground", "recreation", "tree", "plant", "green",
                "space", "public space", "play", "children", "bench", "seating"
            ],
            "noise": [
                "noise", "loud", "sound", "disturbance", "quiet", "peace", "peaceful",
                "construction", "party", "music", "speaker", "horn", "honking"
            ],
            "healthcare": [
                "hospital", "clinic", "doctor", "health", "medical", "medicine", "ambulance",
                "emergency", "patient", "treatment", "care", "disease", "infection"
            ],
            "education": [
                "school", "college", "university", "education", "student", "teacher",
                "classroom", "learn", "learning", "study", "studying", "library", "book"
            ],
            "government": [
                "government", "official", "authority", "mayor", "commissioner", "minister",
                "administration", "department", "municipal", "corporation", "council"
            ],
            "other": []  # Default category
        }
    
    def classify(self, text: str) -> str:
        """
        Classify text into one of the predefined categories
        Returns the category name
        """
        # For prototype, we'll use a simple rule-based classifier
        text = text.lower()
        
        # Count matches for each category
        category_counts = {}
        for category, keywords in self.category_keywords.items():
            # Skip 'other' category
            if category == "other":
                continue
                
            # Count matches
            count = 0
            for keyword in keywords:
                # Check for whole word matches
                count += len(re.findall(r'\b' + re.escape(keyword) + r'\b', text))
            
            if count > 0:
                category_counts[category] = count
        
        # Find category with most keyword matches
        if category_counts:
            # Get category with maximum count
            best_category = max(category_counts, key=category_counts.get)
            return best_category
        
        # Default category if no matches
        return "other"
