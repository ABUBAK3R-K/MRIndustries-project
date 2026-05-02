import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from model_utils import ensure_model_exists, MODEL_PATH

ensure_model_exists()

base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=False)
detector = vision.PoseLandmarker.create_from_options(options)

def estimate_measurements(person_path, height_cm):
    try:
        img = cv2.imread(person_path)
        if img is None:
            raise ValueError("Image not found")
            
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=img_rgb)
        detection_result = detector.detect(mp_image)
        
        if not detection_result.pose_landmarks:
            raise ValueError("No pose detected")
            
        landmarks = detection_result.pose_landmarks[0]
        h, w, _ = img.shape
        
        # Calculate pixel coordinates
        def get_pt(lm):
            return int(lm.x * w), int(lm.y * h)
            
        nose = get_pt(landmarks[0])
        l_heel = get_pt(landmarks[29])
        r_heel = get_pt(landmarks[30])
        
        l_shoulder = get_pt(landmarks[11])
        r_shoulder = get_pt(landmarks[12])
        
        l_hip = get_pt(landmarks[23])
        r_hip = get_pt(landmarks[24])
        
        # Estimate pixel height of person (nose to average heel y)
        avg_heel_y = (l_heel[1] + r_heel[1]) / 2
        pixel_height = avg_heel_y - nose[1]
        
        if pixel_height <= 0:
            pixel_height = h * 0.8 # Fallback
            
        # Ratio: cm per pixel
        # Real height is typically from top of head, nose is slightly lower. Let's adjust height_cm slightly or just use it.
        cm_per_pixel = height_cm / (pixel_height * 1.1) # 1.1 accounts for head top to nose and heel to floor
        
        # Calculate measurements in pixels
        shoulder_width_px = ((l_shoulder[0] - r_shoulder[0])**2 + (l_shoulder[1] - r_shoulder[1])**2)**0.5
        hip_width_px = ((l_hip[0] - r_hip[0])**2 + (l_hip[1] - r_hip[1])**2)**0.5
        
        # Torso length (average shoulder y to average hip y)
        avg_shoulder_y = (l_shoulder[1] + r_shoulder[1]) / 2
        avg_hip_y = (l_hip[1] + r_hip[1]) / 2
        torso_length_px = avg_hip_y - avg_shoulder_y
        
        # Convert to cm
        shoulder_width_cm = shoulder_width_px * cm_per_pixel
        hip_width_cm = hip_width_px * cm_per_pixel
        torso_length_cm = torso_length_px * cm_per_pixel
        
        # Simple size recommendation logic based on shoulder width
        # Note: These are rough estimates for POC
        if shoulder_width_cm < 38:
            rec_size = "XS"
        elif shoulder_width_cm < 42:
            rec_size = "S"
        elif shoulder_width_cm < 46:
            rec_size = "M"
        elif shoulder_width_cm < 50:
            rec_size = "L"
        else:
            rec_size = "XL"
            
        return {
            "shoulder_width": f"{shoulder_width_cm:.1f} cm",
            "torso_length": f"{torso_length_cm:.1f} cm",
            "hip_width": f"{hip_width_cm:.1f} cm",
            "recommended_size": rec_size
        }
        
    except Exception as e:
        print("Measurement Error:", e)
        return {
            "shoulder_width": "N/A",
            "torso_length": "N/A",
            "hip_width": "N/A",
            "recommended_size": "M (Fallback)"
        }
