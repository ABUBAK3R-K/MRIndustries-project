# AuraFit — AI-Powered Multi-Community Virtual Try-On Platform

AuraFit is a full-stack, AI-powered e-commerce platform built for five distinct cultural communities (Hindu, Muslim, Sikh, Buddhist, Christian). It features a premium Stitch-generated storefront UI, a FastAPI backend with a computer vision pipeline, a content-based product recommendation engine, and an AI Virtual Try-On Studio.

---

## Technical Questions & Answers

### 1. What approach did you take for garment overlay and why?

For the garment overlay, I went with a multi-stage Computer Vision pipeline using MediaPipe and OpenCV, rather than jumping straight into heavy generative AI models. Here's how I put it together:

1. **Background Removal**: I used `rembg` (which runs U²-Net under the hood) to strip the background from the uploaded garment image. It gives a really clean alpha mask so the garment doesn't look like a square block pasted on the user.
2. **Pose Detection**: I ran the person's photo through MediaPipe's `PoseLandmarker` to grab 33 full-body landmarks. I specifically zeroed in on the shoulders, hips, and ankles to get a sense of their actual physical proportions.
3. **Category-Aware Sizing**: This was crucial. A saree shouldn't be sized the same way as a t-shirt. I used **OpenAI's CLIP** model to classify the garment first (more on that below). Once I knew if it was a Top, Bottom, or Full-Length item, I scaled it to match the specific body segment (like matching a Top's height to the user's torso length so it doesn't drop past their hips).
4. **Vectorised Alpha Blending**: Finally, I used a fast NumPy vectorised blending loop to composite the garment onto the person. 

**Why this approach?** Honestly, speed and accessibility. This pipeline runs in under 5 seconds on a standard CPU laptop. Generative models are amazing, but they require serious GPU power and have massive latency. For a POC, I wanted something that felt snappy and reliable while still proving the core concept.

---

### 2. What were the biggest challenges you faced?

**The MediaPipe API Break**
The most frustrating blocker was discovering that the modern `mediapipe` library (v0.10.x) completely deleted the legacy `mp.solutions.pose` module that every tutorial on the internet uses. I had to migrate everything from scratch to the new Tasks API (`PoseLandmarker`), which required figuring out how to manually download and load `.task` binary models programmatically.

**Garment Proportion Tuning**
Getting the clothes to actually look like they fit the body was really tough. My first attempt was just scaling the garment to the person's shoulder width, but that made flowing garments like abayas look ridiculous. I had to build out separate padding and clamping logic for different types of clothes, ensuring that a tall, narrow garment wasn't forced into a short, wide bounding box.

**Classifying Traditional Clothes**
Standard ImageNet classifiers have no idea what a "sherwani" or a "lehenga" is. I was getting terrible classification results until I swapped out MobileNet for **CLIP (Transformers)**. Since CLIP understands natural language, I just gave it text prompts like "a saree draped fabric" or "a hijab", and it was able to classify these cultural garments perfectly with zero-shot learning.

---

### 3. What does not work well in your current solution?

**The Clothes Look "Flat"**
Because I'm using a 2D affine transformation, the clothes don't drape or warp around the 3D volume of the body. A silk dress won't flow naturally, and it doesn't wrap around curves.

**Occlusion (Arms and Hands)**
If the user has their hands in their pockets or arms crossed, the system will just paste the shirt directly over their arms. It breaks the illusion completely. I'd need a proper body parsing segmentation mask to identify the arms and render the garment *behind* them.

**Lighting and Shadows**
The garment is usually shot under bright studio lighting, and when it's pasted onto a user photo taken in a dimly lit room, the mismatch is pretty obvious. The current setup doesn't harmonise the lighting or cast any realistic shadows on the body.

---

### 4. If you had 2 weeks instead of 72 hours, what would you build differently?

If I had more time, I would focus heavily on realism and user experience:

- **Thin Plate Spline (TPS) Warping**: I'd implement TPS to warp the garment. By mapping control points on the garment to the person's body mesh, the clothes would actually stretch and curve realistically with the body shape.
- **Body Parsing**: I'd add a model like SCHP (Self-Correction for Human Parsing) to generate pixel-level masks for arms and hands, solving the occlusion problem entirely.
- **Real-Time Video Try-On**: It would be awesome to stream webcam frames via WebSockets to the backend and overlay the clothes in real-time like a digital mirror.
- **Persistent Profiles**: I'd let users save their body measurements and base photo, so they can just browse the store and click "Try On" without uploading anything.
- **A Full Checkout Flow**: I'd wire up Stripe or Razorpay and build out a persistent shopping cart state so the e-commerce side is fully functional.

---

### 5. What production-grade models would you use for real deployment?

If I were taking AuraFit to production and had a cluster of A100 GPUs, I would completely ditch the 2D OpenCV approach and use state-of-the-art generative models:

1. **VITON-HD**: This is the gold standard right now for high-res (1024x1024) try-ons. It's fantastic at preserving the original garment's texture, logos, and embroidery, which is super important for the highly detailed cultural clothing in AuraFit.
2. **DCI-VTON**: This builds on VITON but uses DensePose UV maps. It handles complex poses (like arms raised or body turned) way better than anything else.
3. **SDXL + ControlNet + IP-Adapter**: This is the most flexible approach. ControlNet uses OpenPose to maintain the body structure, while the IP-Adapter injects the specific garment texture into the latent space. SDXL then inpaints the scene with photorealistic lighting, shadows, and fabric draping. It's expensive to run, but the results are basically indistinguishable from a real photoshoot.

---

## Features

1. **Virtual Try-On Engine** — Uses `rembg` for background removal, MediaPipe for pose estimation, and OpenCV for category-aware overlay and fast vectorised alpha blending.
2. **Product Recommendation Engine** — A content-based recommender built with `scikit-learn`. It uses TF-IDF vectorisation and cosine similarity to match user interests against a 56-product catalog, factoring in budget and ratings.
3. **Garment Classifier** — Uses OpenAI's **CLIP** model (`transformers`) for zero-shot classification, allowing it to correctly identify traditional/cultural clothing via natural language processing.
4. **Body Measurement Estimation** — Calculates shoulder width, torso length, and hip width from landmark pixel distances, recommending a clothing size.
5. **Multi-Store Storefront** — Five pixel-perfect Stitch-generated community stores with a dynamic AI recommendations section integrated into the UI.

---

## Setup Instructions

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
python app.py
# API available at http://localhost:8000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# React shell at http://localhost:5173
```

### 3. Jupyter Notebook Demo

```bash
cd backend
.\venv\Scripts\pip install jupyter pandas matplotlib
.\venv\Scripts\jupyter notebook AuraFit_Showcase.ipynb
```
