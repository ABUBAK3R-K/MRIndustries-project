from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
import os
import json
import uuid

# Import our ML modules
from tryon import process_tryon
from measurement import estimate_measurements
from recommender import get_recommendations
from classifier import classify_garment

app = FastAPI(title="AI Virtual Try-On API")

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
OUTPUT_DIR = "outputs"

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

@app.post("/tryon")
async def api_tryon(
    person_image: UploadFile = File(...),
    garment_image: UploadFile = File(...)
):
    try:
        person_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{person_image.filename}")
        garment_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{garment_image.filename}")
        
        with open(person_path, "wb") as f:
            f.write(await person_image.read())
        with open(garment_path, "wb") as f:
            f.write(await garment_image.read())

        output_filename = f"result_{uuid.uuid4()}.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        
        category_result = classify_garment(garment_path)
        garment_category = category_result.get("category", "Top")
        success = process_tryon(person_path, garment_path, output_path, garment_category)
        
        if success:
            return FileResponse(output_path, media_type="image/png")
        else:
            raise HTTPException(status_code=500, detail="Try-on processing failed.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/measurements")
async def api_measurements(
    person_image: UploadFile = File(...),
    user_height: float = Form(...)
):
    try:
        person_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{person_image.filename}")
        with open(person_path, "wb") as f:
            f.write(await person_image.read())
            
        measurements = estimate_measurements(person_path, user_height)
        return JSONResponse(content=measurements)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend")
async def api_recommend(profile: dict):
    try:
        recommendations = get_recommendations(profile)
        return JSONResponse(content={"recommendations": recommendations})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/classify")
async def api_classify(garment_image: UploadFile = File(...)):
    try:
        garment_path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4()}_{garment_image.filename}")
        with open(garment_path, "wb") as f:
            f.write(await garment_image.read())
            
        result = classify_garment(garment_path)
        return JSONResponse(content=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
