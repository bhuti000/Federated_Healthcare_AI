# 🐍 Federated Healthcare AI - Backend

The robust FastAPI backend engine that powers the Federated Healthcare AI platform, handling federated model inference and explainability generation.

## 🧠 Core Capabilities

-   **Multi-Model Inference**:
    -   Loads pre-trained TensorFlow/Keras models for Brain, Chest, and Skin diagnosis.
    -   Optimized for rapid inference.
-   **Explainable AI (XAI)**:
    -   **SHAP**: Generates deep-learning feature attribution plots.
    -   **Grad-CAM**: Creates heatmaps to visualize model focus.
    -   **Deep Scan vs Fast Scan**: Configurable sampling rates for performance vs precision.
-   **API Design**:
    -   RESTful endpoints built with **FastAPI**.
    -   Async processing for non-blocking 3D visualization support.

## 🛠️ Setup & Running

### Prerequisites
-   Python 3.8+
-   pip

### Installation
```bash
pip install -r requirements.txt
```

### Run Server
Starts the API server at `http://127.0.0.1:5000`.
```bash
python -m uvicorn main:app --reload --port 5000
```

## 📡 API Endpoints

### `POST /predict/{task_type}`
Main inference endpoint.
-   **Path Parameters**:
    -   `task_type`: `brain`, `chest`, or `skin`.
-   **Form Data**:
    -   `file`: The medical image file.
    -   `deep_scan`: Boolean flag (true/false) to enable SHAP analysis.
-   **Response**: JSON object containing:
    -   `prediction`: The diagnostic class.
    -   `confidence`: Probability score.
    -   `heatmap_url`: URL to the generated Grad-CAM heatmap.
    -   `shap_url`: URL to the generated SHAP plot (if deep_scan=true).

## 📂 Key Files

-   `main.py`: API entry point and route definitions.
-   `explain.py`: XAI logic (SHAP/Grad-CAM generation).
-   `models/`: Directory for `.h5` model files.
-   `uploads/`: Temporary storage for processed images and visualizations.
