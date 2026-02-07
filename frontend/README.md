# ⚛️ Federated Healthcare AI - Frontend

The high-performance React client for the Federated Healthcare AI platform, featuring immersive 3D visualizations and real-time explainable AI results.

## 🚀 Key Features

-   **Interactive 3D Visualizer**:
    -   Powered by **Three.js** (`@react-three/fiber`).
    -   Renders real-time models of **Brain**, **Lungs**, and **Skin**.
    -   Includes "Cyber-Pulse" scanning animations and dynamic particle effects.
-   **Explainability Dashboard**:
    -   displays **SHAP** (feature contribution) and **Grad-CAM** (heatmap) results.
    -   Interactive charts for confidence scores.
-   **Modern UI/UX**:
    -   **Glassmorphism** design system with neon accents.
    -   Smooth transitions using **GSAP** and CSS animations.
    -   Responsive layout for all devices.

## 🛠️ Setup & Scripts

### Prerequisites
-   Node.js (v14+)
-   npm

### Installation
```bash
npm install
```

### Development
Runs the app in development mode at `http://localhost:3000`.
```bash
npm start
```

### Production Build
Builds the app for production to the `build` folder.
```bash
npm run build
```

## 📂 Project Structure

-   `src/components/`: Reusable UI components.
-   `src/Brain3D.js`: Interactive 3D Brain model with cyber-medical textures.
-   `src/Chest3D.js`: 3D Chest/Lungs visualization.
-   `src/Skin3D.js`: 3D Skin patch with dermis layers and scanning animation.
-   `src/App.js`: Main application logic and state management.
-   `src/App.css`: Global styles, animations, and glassmorphism effects.

## 🎨 Styling

The application uses a custom CSS architecture with CSS Variables for theming:
-   `--glass-bg`: Translucent background for cards.
-   `--accent-green`: Primary accent color for AI success/confidence.
-   `--accent-cyan`: Secondary accent for 3D elements.
