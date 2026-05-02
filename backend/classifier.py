import torch
from PIL import Image
from transformers import CLIPProcessor, CLIPModel

# Load CLIP model for zero-shot classification
model_name = "openai/clip-vit-base-patch32"
clip_model = CLIPModel.from_pretrained(model_name)
clip_processor = CLIPProcessor.from_pretrained(model_name)
clip_model.eval()

# Candidate labels — these cover traditional/cultural garments
# that ImageNet-based classifiers completely miss
CANDIDATE_LABELS = [
    # Tops
    "a shirt or t-shirt",
    "a kurta or tunic top",
    "a blouse or crop top",
    "a jacket or blazer",
    "a sweater or cardigan",
    # Bottoms
    "trousers or pants",
    "a skirt",
    "shorts",
    "a salwar or palazzo pants",
    # Full Length
    "a dress or gown",
    "a saree draped fabric",
    "a lehenga or long skirt with top",
    "an abaya or long modest robe",
    "a sherwani or long formal coat",
    "a kaftan or caftan dress",
    "a thobe or long tunic robe",
    "an anarkali suit or floor length dress",
    "a jumpsuit or romper",
    # Headwear
    "a turban or headwrap",
    "a hijab or headscarf",
    "a hat or cap",
    # Accessories
    "a scarf or dupatta or stole",
    "a necklace or jewelry",
    "shoes or sandals",
    "a belt or bag or purse",
    "a tie or bow tie",
]

# Map each label to a garment category
LABEL_TO_CATEGORY = {
    "a shirt or t-shirt": "Top",
    "a kurta or tunic top": "Top",
    "a blouse or crop top": "Top",
    "a jacket or blazer": "Top",
    "a sweater or cardigan": "Top",
    "trousers or pants": "Bottom",
    "a skirt": "Bottom",
    "shorts": "Bottom",
    "a salwar or palazzo pants": "Bottom",
    "a dress or gown": "Full Length",
    "a saree draped fabric": "Full Length",
    "a lehenga or long skirt with top": "Full Length",
    "an abaya or long modest robe": "Full Length",
    "a sherwani or long formal coat": "Full Length",
    "a kaftan or caftan dress": "Full Length",
    "a thobe or long tunic robe": "Full Length",
    "an anarkali suit or floor length dress": "Full Length",
    "a jumpsuit or romper": "Full Length",
    "a turban or headwrap": "Headwear",
    "a hijab or headscarf": "Headwear",
    "a hat or cap": "Headwear",
    "a scarf or dupatta or stole": "Accessory",
    "a necklace or jewelry": "Accessory",
    "shoes or sandals": "Accessory",
    "a belt or bag or purse": "Accessory",
    "a tie or bow tie": "Accessory",
}


def classify_garment(image_path):
    """
    Zero-shot garment classification using CLIP.
    
    Unlike ImageNet-based classifiers, CLIP understands natural language
    descriptions so it can correctly identify cultural garments like
    sherwanis, abayas, lehengas, and sarees that have no ImageNet class.
    """
    try:
        image = Image.open(image_path).convert("RGB")

        inputs = clip_processor(
            text=CANDIDATE_LABELS,
            images=image,
            return_tensors="pt",
            padding=True,
        )

        with torch.no_grad():
            outputs = clip_model(**inputs)
            logits = outputs.logits_per_image[0]  # shape: [num_labels]
            probs = logits.softmax(dim=0)

        best_idx = probs.argmax().item()
        best_label = CANDIDATE_LABELS[best_idx]
        best_score = probs[best_idx].item()

        category = LABEL_TO_CATEGORY.get(best_label, "Top")

        return {
            "category": category,
            "clip_label": best_label,
            "confidence": f"{best_score:.2f}",
        }

    except Exception as e:
        print(f"CLIP Classifier Error: {e}")
        return {
            "category": "Top",
            "clip_label": "fallback",
            "confidence": "0.0",
        }
