# 🏥 Federated Healthcare AI

**A Next-Generation AI Platform for Secure & Explainable Medical Diagnosis.**

This project leverages **Federated Learning** to train medical AI models while preserving patient privacy. It features a state-of-the-art **React Frontend** with **Interactive 3D Visualizations** and a robust **FastAPI Backend** powered by **Explainable AI (XAI)**.

---

## 🌟 Key Features

### 1. Multi-Modal Diagnosis
- **🧠 Brain Tumor Detection**: Analyzes MRI scans to detect glioma, meningioma, and pituitary tumors.
- **🫁 Chest X-Ray Analysis**: Detects pneumonia and other thoracic abnormalities.
- **🔬 Skin Cancer Screening**: Identifies melanoma, nevus, and other skin lesions.

### 2. Explainable AI (XAI) - The "Whys" behind the AI
We don't just give a prediction; we explain *why*.
- **SHAP (SHapley Additive exPlanations)**: A deep-learning approach that breaks down the image contribution to the model's decision.
- **Grad-CAM Heatmaps**: Visualizes the exact regions the AI is focusing on (e.g., highlighting a tumor core).

### 3. Immersive 3D Exprience
- **Real-Time 3D Models**: Interactive 3D representations of the **Brain**, **Lungs**, and **Skin**.
- **Cyber-Medical Aesthetics**: High-tech visuals with "Cyber-Pulse" animations and dynamic particles.
- **Interactive**: The 3D background responds to your mouse movements and analysis state.

### 4. Advanced Scanning Modes
- **⚡ Fast Scan**: Quick prediction for rapid triage.
- **🔍 Deep Scan**: Extensive analysis using higher-precision sampling (SHAP) for detailed insights.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React.js
- **3D Engine**: Three.js (@react-three/fiber, @react-three/drei)
- **Animations**: GSAP (GreenSock Animation Platform)
- **Styling**: Modern CSS3 (Glassmorphism, Neon Glows)
- **Charts**: Chart.js (Confidence Analysis)

### Backend
- **API**: FastAPI (Python)
- **ML Engine**: TensorFlow / Keras
- **Image Processing**: OpenCV, NumPy
- **Explainability**: SHAP, tf-keras-vis (Grad-CAM)

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js** (v14+)
- **Python** (v3.8+)

### 1. Backend Setup
Navigate to the `backend` folder and install dependencies:
```bash
cd backend
pip install -r requirements.txt
# If you don't have a requirements.txt, make sure to install:
# pip install fastapi uvicorn tensorflow numpy opencv-python shap matplotlib scikit-learn
```

### 2. Frontend Setup
Navigate to the `frontend` folder and install dependencies:
```bash
cd frontend
npm install
# Required libraries:
# npm install three @react-three/fiber @react-three/drei gsap chart.js react-chartjs-2 axios framer-motion
```

---

## 🏃‍♂️ Running the Application

### Step 1: Start the Backend Server
```bash
cd backend
python -m uvicorn main:app --reload --port 5000
```
*The API will start at `http://127.0.0.1:5000`*

### Step 2: Start the Frontend Client
```bash
cd frontend
npm start
```
*The App will open at `http://localhost:3000`*

---

## 🧪 Usage Guide

1.  **Select Diagnosis Type**: Choose between **Brain**, **Chest**, or **Skin** from the dropdown.
2.  **Upload Scan**: Click "Choose File" to upload a medical image (JPEG/PNG).
3.  **Choose Scan Mode**: Toggle "Deep Scan" for a more detailed XAI analysis.
4.  **Run Diagnosis**: Click "⚡ Run Diagnosis".
5.  **View Results**:
    -   See the **Diagnosis Result** & **Confidence Score**.
    -   Explore the **Explainability** section with **SHAP** and **Heatmap** visualizations.
    -   Enjoy the interactive **3D Background** reflecting the analysis context.

---

## 🤝 Contributing
Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License
MIT License.
