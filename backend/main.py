from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
os.environ["KERAS_BACKEND"] = "tensorflow"
import tensorflow as tf
try:
    import keras
except ImportError:
    from tensorflow import keras
import numpy as np
import os
import cv2
from PIL import Image
import shutil
from explain import grad_cam, generate_shap_plot

# =========================
# APP CONFIG
# =========================
app = FastAPI(title="Federated Healthcare AI API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
MODEL_FOLDER = os.path.join(BASE_DIR, "models")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Mount static files for serving uploads
app.mount("/uploads", StaticFiles(directory=UPLOAD_FOLDER), name="uploads")

# =========================
# LOAD MODEL
# =========================
MODEL_PATH = os.path.join(MODEL_FOLDER, "global_Brain_model.keras")

if not os.path.exists(MODEL_PATH):
    print(f"⚠️ Model not found at {MODEL_PATH}")
    brain_model = None
else:
    print("🔄 Loading model...")
    try:
        brain_model = keras.models.load_model(MODEL_PATH, compile=False)
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        brain_model = None

# =========================
# CLASS LABELS
# =========================
brain_classes = ["Glioma", "Meningioma", "Pituitary", "No Tumor"]
chest_classes = ["Normal", "Pneumonia", "COVID"]
skin_classes = ["Benign", "Malignant"]


# =========================
# IMAGE PREPROCESS
# =========================
def preprocess_image(path):
    img = Image.open(path).convert("RGB")
    img = img.resize((224, 224))
    img = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(img, axis=0)


# =========================
# ROOT ENDPOINT
# =========================
@app.get("/")
async def root():
    return {
        "message": "Federated Healthcare AI API",
        "version": "1.0.0",
        "endpoints": {
            "predict_brain": "/predict/brain (POST)",
            "predict_chest": "/predict/chest (POST)",
            "predict_skin": "/predict/skin (POST)",
            "uploads": "/uploads (Static files)",
        },
        "status": "running",
    }


# =========================
# PREDICTION ENDPOINTS
# =========================


@app.post("/predict/brain")
async def predict_brain(image: UploadFile = File(...), deep_scan: str = Form("true")):
    if not brain_model:
        raise HTTPException(status_code=500, detail="Brain model not loaded")

    try:
        is_deep_scan = deep_scan.lower() == "true"
        filepath = os.path.join(UPLOAD_FOLDER, image.filename)

        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)

        # ---- Prediction ----
        img = preprocess_image(filepath)
        raw_pred = brain_model(img, training=False)
        preds = np.array(raw_pred).flatten()

        # Handle binary model
        if len(preds) == 1:
            preds = np.array([1 - preds[0], preds[0]])

        pred_index = int(np.argmax(preds))
        pred_label = (
            brain_classes[pred_index] if pred_index < len(brain_classes) else "Unknown"
        )

        # ---- Auto detect last conv layer for Grad-CAM ----
        # ---- Auto detect last conv layer for Grad-CAM ----
        def find_last_conv_layer(model):
            """Recursively find the last convolutional layer in a model."""
            with open("layer_debug.log", "a") as f:
                f.write(f"Scanning model layers...\n")
                
            for layer in reversed(model.layers):
                with open("layer_debug.log", "a") as f:
                    f.write(f"Checking layer: {layer.name} ({type(layer).__name__})\n")
                
                # Check for nested models (e.g., VGG16, ResNet base)
                if hasattr(layer, 'layers'):
                    with open("layer_debug.log", "a") as f:
                        f.write(f"  -> Descending into nested model: {layer.name}\n")
                    result = find_last_conv_layer(layer)
                    if result:
                        return result
                # Check for direct Conv layer
                if 'conv' in layer.name.lower() or isinstance(layer, keras.layers.Conv2D):
                    with open("layer_debug.log", "a") as f:
                        f.write(f"✅ Found match: {layer.name}\n")
                    return layer.name
            return None

        with open("layer_debug.log", "w") as f:
            f.write("--- New Request ---\n")
            
        last_conv_layer = find_last_conv_layer(brain_model)
        
        with open("layer_debug.log", "a") as f:
            f.write(f"Final Selection: {last_conv_layer}\n")

        if last_conv_layer:
            print(f"✅ Found last conv layer: {last_conv_layer}")
        else:
            print("⚠️ No convolutional layer found for Grad-CAM")

        heatmap_url = None
        shap_url = None
        base_name = os.path.splitext(image.filename)[0]

        # ---- Safe Grad-CAM ----
        if last_conv_layer is not None:
            try:
                with open("gradcam_debug.log", "a") as f:
                    f.write(f"Calling grad_cam for layer: {last_conv_layer}\n")
                
                heatmap = grad_cam(brain_model, img, last_conv_layer)
                
                if heatmap is not None:
                    with open("gradcam_debug.log", "a") as f:
                        f.write(f"Grad-CAM returned heatmap with shape: {heatmap.shape}\n")
                        
                    heatmap = cv2.resize(heatmap, (224, 224))
                    heatmap = cv2.applyColorMap(np.uint8(255 * heatmap), cv2.COLORMAP_JET)
    
                    original = cv2.imread(filepath)
                    original = cv2.resize(original, (224, 224))
                    overlay = cv2.addWeighted(original, 0.6, heatmap, 0.4, 0)
    
                    heatmap_name = f"{base_name}_heatmap.jpg"
                    heatmap_path = os.path.join(UPLOAD_FOLDER, heatmap_name)
                    cv2.imwrite(heatmap_path, overlay)
                    heatmap_url = f"uploads/{heatmap_name}"
                    
                    with open("gradcam_debug.log", "a") as f:
                         f.write(f"Saved heatmap to {heatmap_url}\n")
                else:
                    with open("gradcam_debug.log", "a") as f:
                        f.write(f"Grad-CAM returned None\n")

            except Exception as e:
                err_msg = f"Grad-CAM generation failed: {e}"
                print(f"❌ {err_msg}")
                with open("gradcam_debug.log", "a") as f:
                    f.write(f"{err_msg}\n")
                import traceback
                traceback.print_exc()

        # ---- Safe SHAP ----
        if is_deep_scan:
            try:
                original = cv2.imread(filepath)
                shap_name = f"{base_name}_shap.png"
                shap_path = os.path.join(UPLOAD_FOLDER, shap_name)

                success = generate_shap_plot(
                    brain_model, img, original, shap_path, class_names=brain_classes
                )
                if success:
                    shap_url = f"uploads/{shap_name}"
            except Exception as e:
                print(f"⚠️ SHAP failed: {e}")

        return {
            "labels": brain_classes[: len(preds)],
            "values": [round(float(p) * 100, 2) for p in preds],
            "prediction": pred_label,
            "heatmap": heatmap_url,
            "shap": shap_url,
        }
    except Exception as e:
        print(f"🔥 Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/chest")
async def predict_chest(image: UploadFile = File(...)):
    return {
        "labels": chest_classes,
        "values": [80.1, 12.4, 7.5],
        "prediction": "Normal",
        "heatmap": None,
        "status": "Federated global model training in progress",
    }


@app.post("/predict/skin")
async def predict_skin(image: UploadFile = File(...)):
    return {
        "labels": skin_classes,
        "values": [85.2, 14.8],
        "prediction": "Benign",
        "heatmap": None,
        "status": "Federated global model training in progress",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=5000)
