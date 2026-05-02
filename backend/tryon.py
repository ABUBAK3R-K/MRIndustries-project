import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from rembg import remove
from PIL import Image
from model_utils import ensure_model_exists, MODEL_PATH

ensure_model_exists()

base_options = python.BaseOptions(model_asset_path=MODEL_PATH)
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=False)
detector = vision.PoseLandmarker.create_from_options(options)


def get_landmarks(image_rgb):
    """Detect pose landmarks from an RGB image."""
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
    detection_result = detector.detect(mp_image)
    if not detection_result.pose_landmarks:
        return None
    return detection_result.pose_landmarks[0]


def crop_to_content(img_bgra):
    """Crop a BGRA image to its non-transparent bounding box."""
    alpha = img_bgra[:, :, 3]
    y_indices, x_indices = np.where(alpha > 10)
    if len(y_indices) == 0:
        return img_bgra
    return img_bgra[y_indices.min():y_indices.max()+1,
                    x_indices.min():x_indices.max()+1]


def alpha_blend_fast(background, overlay_bgra, x_off, y_off):
    """
    Fast vectorized alpha-composite of overlay_bgra onto background (BGR).
    Handles out-of-bounds clipping automatically.
    """
    h_bg, w_bg = background.shape[:2]
    h_ov, w_ov = overlay_bgra.shape[:2]

    # Compute the region that actually overlaps
    x1, y1 = max(x_off, 0), max(y_off, 0)
    x2, y2 = min(x_off + w_ov, w_bg), min(y_off + h_ov, h_bg)

    if x1 >= x2 or y1 >= y2:
        return background

    # Corresponding region in the overlay
    ox1, oy1 = x1 - x_off, y1 - y_off
    ox2, oy2 = ox1 + (x2 - x1), oy1 + (y2 - y1)

    overlay_region = overlay_bgra[oy1:oy2, ox1:ox2]
    alpha = overlay_region[:, :, 3:4].astype(np.float32) / 255.0

    bg_region = background[y1:y2, x1:x2].astype(np.float32)
    fg_region = overlay_region[:, :, :3].astype(np.float32)

    blended = alpha * fg_region + (1.0 - alpha) * bg_region
    background[y1:y2, x1:x2] = blended.astype(np.uint8)
    return background


def process_tryon(person_path, garment_path, output_path, category="Top"):
    """
    Improved try-on pipeline:
    1. Remove garment background & crop to content
    2. Detect person pose landmarks
    3. Scale garment to match body proportions precisely
    4. Position garment at the correct body anchor point
    5. Fast vectorized alpha-blend onto person image
    """
    try:
        # ── Load images ──────────────────────────────────────────
        person_img = cv2.imread(person_path)
        if person_img is None:
            print("Error: Could not read person image")
            return False

        garment_raw = cv2.imread(garment_path)
        if garment_raw is None:
            print("Error: Could not read garment image")
            return False

        # ── Remove garment background & crop ─────────────────────
        garment_pil = Image.fromarray(cv2.cvtColor(garment_raw, cv2.COLOR_BGR2RGB))
        garment_nobg_pil = remove(garment_pil)
        garment_bgra = cv2.cvtColor(np.array(garment_nobg_pil), cv2.COLOR_RGBA2BGRA)
        garment_cropped = crop_to_content(garment_bgra)

        # ── Detect pose ──────────────────────────────────────────
        person_rgb = cv2.cvtColor(person_img, cv2.COLOR_BGR2RGB)
        landmarks = get_landmarks(person_rgb)

        h, w = person_img.shape[:2]

        if landmarks is None:
            # Fallback: center overlay at 60% width
            print("Warning: No pose detected, using centered fallback")
            gh, gw = garment_cropped.shape[:2]
            target_w = int(w * 0.6)
            target_h = int(target_w * (gh / gw))
            resized = cv2.resize(garment_cropped, (target_w, target_h),
                                 interpolation=cv2.INTER_AREA)
            result = person_img.copy()
            x_off = (w - target_w) // 2
            y_off = (h - target_h) // 3
            result = alpha_blend_fast(result, resized, x_off, y_off)
            cv2.imwrite(output_path, result)
            return True

        # ── Extract body landmarks ───────────────────────────────
        def pt(idx):
            return int(landmarks[idx].x * w), int(landmarks[idx].y * h)

        l_shoulder = pt(11)
        r_shoulder = pt(12)
        l_hip = pt(23)
        r_hip = pt(24)
        l_ankle = pt(27)
        r_ankle = pt(28)

        shoulder_width = abs(l_shoulder[0] - r_shoulder[0])
        hip_width = abs(l_hip[0] - r_hip[0])
        shoulder_mid_x = (l_shoulder[0] + r_shoulder[0]) // 2
        shoulder_mid_y = (l_shoulder[1] + r_shoulder[1]) // 2
        hip_mid_x = (l_hip[0] + r_hip[0]) // 2
        hip_mid_y = (l_hip[1] + r_hip[1]) // 2
        ankle_mid_y = (l_ankle[1] + r_ankle[1]) // 2

        torso_length = abs(shoulder_mid_y - hip_mid_y)
        leg_length = abs(hip_mid_y - ankle_mid_y)
        body_length = abs(shoulder_mid_y - ankle_mid_y)

        gh, gw = garment_cropped.shape[:2]
        aspect = gh / gw

        # ── Size and position by category ────────────────────────
        if category == "Bottom":
            # Width matches hips with some room, height from hip to ankle
            target_w = int(hip_width * 1.6)
            target_h = int(target_w * aspect)
            # Clamp height to not exceed leg length + some margin
            if target_h > leg_length * 1.15:
                target_h = int(leg_length * 1.15)
                target_w = int(target_h / aspect)

            center_x = hip_mid_x
            start_y = hip_mid_y - int(target_h * 0.05)
            start_x = center_x - (target_w // 2)

        elif category == "Full Length":
            # Width matches wider of shoulders/hips, height covers full body
            body_width = max(shoulder_width, hip_width)
            target_w = int(body_width * 1.5)
            target_h = int(target_w * aspect)
            # Clamp height to body length + margin
            if target_h > body_length * 1.15:
                target_h = int(body_length * 1.15)
                target_w = int(target_h / aspect)

            center_x = shoulder_mid_x
            start_y = shoulder_mid_y - int(target_h * 0.08)
            start_x = center_x - (target_w // 2)

        else:  # Top (default)
            # Width matches shoulders with room for sleeves
            target_w = int(shoulder_width * 1.5)
            target_h = int(target_w * aspect)
            # Clamp height: should cover torso, not much more
            if target_h > torso_length * 1.35:
                target_h = int(torso_length * 1.35)
                target_w = int(target_h / aspect)
            # Ensure width isn't too narrow
            if target_w < shoulder_width * 1.2:
                target_w = int(shoulder_width * 1.3)
                target_h = int(target_w * aspect)

            center_x = shoulder_mid_x
            start_y = shoulder_mid_y - int(target_h * 0.12)
            start_x = center_x - (target_w // 2)

        # Ensure minimum sizes
        target_w = max(target_w, 30)
        target_h = max(target_h, 30)

        # ── Resize garment ───────────────────────────────────────
        garment_resized = cv2.resize(garment_cropped, (target_w, target_h),
                                     interpolation=cv2.INTER_AREA)

        # ── Composite with fast blending ─────────────────────────
        result = person_img.copy()
        result = alpha_blend_fast(result, garment_resized, start_x, start_y)
        cv2.imwrite(output_path, result)
        return True

    except Exception as e:
        print(f"Try-on Error: {e}")
        import traceback
        traceback.print_exc()
        return False
