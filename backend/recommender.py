import csv
import os
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "products_catalog.csv")


def load_catalog():
    """Load the product catalog CSV into a list of dicts."""
    products = []
    with open(CATALOG_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            row["price"] = float(row["price"])
            row["rating"] = float(row["rating"])
            # Keep tags as a clean string for TF-IDF
            row["tags_clean"] = " ".join(
                t.strip().lower() for t in row["tags"].split(",") if t.strip()
            )
            # Also keep a set for quick intersection checks
            row["tags_set"] = set(
                t.strip().lower() for t in row["tags"].split(",") if t.strip()
            )
            products.append(row)
    return products


def build_user_profile_text(profile, catalog):
    """
    Build a text representation of the user's interests for TF-IDF.
    Combines explicit tags, preferred categories, and tags from past purchases.
    """
    parts = []

    # Explicit interest tags
    user_tags = profile.get("tags", [])
    if user_tags:
        parts.extend(t.lower().strip() for t in user_tags)

    # Preferred categories as text tokens
    for cat in profile.get("preferred_categories", []):
        parts.append(cat.lower().replace(" ", "-"))

    # Derive tags from past purchases
    past_ids = set(profile.get("past_purchases", []))
    if past_ids:
        for p in catalog:
            if p["product_id"] in past_ids:
                parts.extend(p["tags_set"])

    return " ".join(parts) if parts else ""


def get_recommendations(profile):
    """
    Content-based recommendation engine using TF-IDF + Cosine Similarity.

    profile dict:
        community: str              – e.g. "Hindu"
        preferred_categories: list   – e.g. ["Top", "Full Length"]
        price_range: [min, max]      – e.g. [50, 200]
        past_purchases: list         – product_ids e.g. ["H001", "H003"]
        tags: list (optional)        – interest tags e.g. ["silk", "festive"]

    Pipeline:
        1. Filter catalog by community
        2. Exclude past purchases
        3. Build a TF-IDF matrix over product tags
        4. Compute cosine similarity between user profile text and each product
        5. Combine similarity score with category match, rating, and price fit
        6. Return top 10 ranked products with explanations
    """
    catalog = load_catalog()

    community = profile.get("community", "").strip()
    preferred_cats = [c.strip() for c in profile.get("preferred_categories", [])]
    price_min, price_max = profile.get("price_range", [0, 99999])
    past_ids = set(profile.get("past_purchases", []))

    # ── Stage 1: Filter by community ─────────────────────────────
    candidates = [p for p in catalog if p["community"].lower() == community.lower()] \
                 if community else catalog

    # Exclude already-purchased products
    candidates = [p for p in candidates if p["product_id"] not in past_ids]

    if not candidates:
        return []

    # ── Stage 2: TF-IDF + Cosine Similarity ──────────────────────
    user_text = build_user_profile_text(profile, catalog)

    # Build corpus: user profile text + all candidate tag strings
    corpus = [user_text] + [c["tags_clean"] for c in candidates]

    vectorizer = TfidfVectorizer()
    tfidf_matrix = vectorizer.fit_transform(corpus)

    # Cosine similarity between user profile (row 0) and every candidate
    user_vec = tfidf_matrix[0:1]
    candidate_vecs = tfidf_matrix[1:]
    similarities = cosine_similarity(user_vec, candidate_vecs).flatten()

    # ── Stage 3: Score each candidate ────────────────────────────
    scored = []
    for i, p in enumerate(candidates):
        reasons = []
        score = 0.0

        # a) TF-IDF cosine similarity (0–35 pts)
        sim_score = similarities[i]
        tag_pts = sim_score * 35
        score += tag_pts
        if sim_score > 0.1:
            # Find matching tags for explanation
            user_tags_set = set(
                t.lower().strip() for t in profile.get("tags", [])
            )
            matching = p["tags_set"] & user_tags_set
            if matching:
                reasons.append(
                    f"Tags match your interests: {', '.join(sorted(matching))}"
                )
            elif sim_score > 0.2:
                reasons.append(f"Similar to your style (cosine: {sim_score:.2f})")

        # b) Category match (0–25 pts)
        if preferred_cats:
            if p["category"] in preferred_cats:
                score += 25
                reasons.append(f"Matches preferred category: {p['category']}")
            else:
                score += 5

        # c) Rating bonus (0–20 pts)
        rating_pts = (p["rating"] / 5.0) * 20
        score += rating_pts
        if p["rating"] >= 4.7:
            reasons.append(f"Highly rated ({p['rating']}★)")

        # d) Price fit (0–20 pts)
        if price_min <= p["price"] <= price_max:
            score += 20
            reasons.append(f"Within your budget (${price_min}–${price_max})")
        elif p["price"] < price_min:
            score += 10
            reasons.append("Great value — below your price range")
        else:
            overage = (p["price"] - price_max) / price_max if price_max > 0 else 0
            penalty = min(overage * 15, 15)
            score -= penalty
            reasons.append(f"Slightly above budget (${p['price']:.0f})")

        if not reasons:
            reasons.append("Community match")

        scored.append({
            "product_id": p["product_id"],
            "name": p["name"],
            "community": p["community"],
            "category": p["category"],
            "price": p["price"],
            "rating": p["rating"],
            "tags": p["tags"],
            "score": round(score, 2),
            "explanation": " | ".join(reasons),
        })

    # ── Stage 4: Rank and return top 10 ──────────────────────────
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:10]
