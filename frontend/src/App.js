import React, { useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from "chartjs-plugin-datalabels";
import gsap from "gsap";
import Chest3D from "./Chest3D";
import Brain3D from "./Brain3D";
import Skin3D from "./Skin3D";
import "./App.css";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function App() {
  const [task, setTask] = useState("brain");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState("");
  const [chart, setChart] = useState(null);
  const [heatmap, setHeatmap] = useState(null);
  const [shap, setShap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deepScan, setDeepScan] = useState(false); // Default to fast mode
  const [bgOpacity, setBgOpacity] = useState(1);
  const [loadingFeedback, setLoadingFeedback] = useState("");

  // Refs for GSAP animations
  const heroRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const formRef = useRef(null);
  const resultRef = useRef(null);

  // Scroll listener for background fade
  // Scroll listener for background fade
  useEffect(() => {
    // Background reference for GSAP
    const bgContainer = document.querySelector('.bg-fade-container');

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const newOpacity = Math.max(0, 1 - scrollY / 500);

      // Use GSAP for smooth tweening of opacity
      gsap.to(bgContainer, {
        opacity: newOpacity,
        duration: 0.1,
        ease: "power1.out",
        overwrite: "auto"
      });
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Initial animations on mount
  useEffect(() => {
    // ... existing GSAP code ...
    const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

    tl.fromTo(
      titleRef.current,
      { y: 100, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2 }
    )
      .fromTo(
        subtitleRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8 },
        "-=0.6"
      )
      .fromTo(
        formRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6 },
        "-=0.4"
      );
  }, []);

  // Handle file preview
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    if (selectedFile) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(selectedFile);
    }
  };

  // Prediction function
  const predict = async () => {
    // ... existing predict function items ...
    if (!file) {
      alert("Please upload an image first");
      return;
    }

    const feedbacks = {
      brain: ["Initializing Neural Scan...", "Mapping Cortical Folds...", "Identifying Potential Anomalies...", "Cross-referencing Global Database...", "Finalizing Brain Diagnosis..."],
      chest: ["Calibrating Pulmonary Sensors...", "Analyzing Bronchial Patterns...", "Detecting Pneumatic Variance...", "Synthesizing Lobe Data...", "Finalizing Chest Diagnosis..."],
      skin: ["Initializing Dermal Scan...", "Mapping Epidermal Texture...", "Analyzing Pigmentation Variance...", "Scanning for Micro-Lesions...", "Finalizing Skin Diagnosis..."]
    };

    const taskFeedbacks = feedbacks[task] || ["Analyzing Data...", "Syncing with Federated AI...", "Optimizing Result...", "Generating Report..."];
    let i = 0;
    setLoadingFeedback(taskFeedbacks[0]);
    // Faster feedback loop for better UX (800ms instead of 2500ms)
    const interval = setInterval(() => {
      i++;
      setLoadingFeedback(taskFeedbacks[i % taskFeedbacks.length]);
    }, 800);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("deep_scan", deepScan);

    try {
      setLoading(true);
      setResult("");
      setChart(null);
      setHeatmap(null);
      setShap(null);

      const res = await fetch(`http://127.0.0.1:5000/predict/${task}`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      // Animate results in
      setResult(data.prediction || "No prediction returned");
      setHeatmap(data.heatmap || null);
      setShap(data.shap || null);

      if (data.labels && data.values) {
        setChart({
          labels: data.labels,
          datasets: [
            {
              label: "Confidence (%)",
              data: data.values,
              backgroundColor: [
                'rgba(0, 255, 136, 0.8)',
                'rgba(0, 200, 255, 0.8)',
                'rgba(138, 43, 226, 0.8)',
                'rgba(255, 107, 107, 0.8)',
              ],
              borderColor: [
                'rgb(0, 255, 136)',
                'rgb(0, 200, 255)',
                'rgb(138, 43, 226)',
                'rgb(255, 107, 107)',
              ],
              borderWidth: 2,
              borderRadius: 8,
            },
          ],
        });
      }

      // Animate results
      if (resultRef.current) {
        gsap.fromTo(
          resultRef.current,
          { scale: 0.8, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.6, ease: "back.out(1.7)" }
        );
      }

    } catch (error) {
      console.error("Prediction error:", error);
      alert("Backend connection failed. Make sure FastAPI server is running.");
    } finally {
      setLoading(false);
      clearInterval(interval);
    }
  };

  return (
    <div className="app">
      {/* 3D Background with Fade Effect */}
      <div className="bg-fade-container" style={{ position: 'fixed', width: '100%', height: '100%', top: 0, left: 0, zIndex: -1 }}>
        {task === 'chest' ? (
          <Chest3D analyzing={loading} result={result} />
        ) : task === 'skin' ? (
          <Skin3D analyzing={loading} result={result} />
        ) : (
          <Brain3D analyzing={loading} result={result} />
        )}
      </div>

      {/* Animated Background */}
      <div className="bg-gradient"></div>
      <div className="bg-grid"></div>

      {/* Hero Section */}
      <header className="hero" ref={heroRef}>
        <div className="hero-content">
          <p className="tag">[ FEDERATED AI HEALTHCARE ]</p>
          <h1 ref={titleRef}>
            <span className="gradient-text">Intelligent</span>
            <br />
            Medical Diagnosis
          </h1>
          <p className="subtitle" ref={subtitleRef}>
            <span className="gradient-text" style={{ fontSize: '1.2rem', fontWeight: 500 }}>
              Advanced AI-powered medical image analysis with
            </span>
            <br />
            <span className="highlight"> explainable predictions</span>
          </p>
        </div>
      </header>

      {/* Main Form */}
      <section className="diagnosis-section" ref={formRef}>
        <div className="glass-card">
          <h2>Upload Medical Scan</h2>

          <div className="form-row">
            <div className="select-wrapper">
              <select value={task} onChange={(e) => setTask(e.target.value)}>
                <option value="brain">🧠 Brain Tumor</option>
                <option value="chest">🫁 Chest X-ray</option>
                <option value="skin">🔬 Skin Cancer</option>
              </select>
            </div>

            <label className="file-upload">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
              />
              <span className="upload-btn">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {file ? file.name : "Choose File"}
              </span>
            </label>
          </div>

          <div className="mode-selector">
            <label className="switch">
              <input
                type="checkbox"
                checked={deepScan}
                onChange={(e) => setDeepScan(e.target.checked)}
              />
              <span className="slider round"></span>
            </label>
            <span className="mode-label">
              {deepScan ? "Deep Scan (Slow, but Detailed)" : "Fast Scan (Quick Prediction)"}
            </span>
          </div>

          {/* Image Preview */}
          {preview && (
            <div className="preview-container">
              <img src={preview} alt="Preview" className="preview-image" />
            </div>
          )}

          <button
            className={`diagnose-btn ${loading ? 'loading' : ''}`}
            onClick={predict}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>{loadingFeedback || "Analyzing..."}</span>
              </>
            ) : (
              <>
                <span className="btn-icon">⚡</span> Run Diagnosis
              </>
            )}
          </button>
        </div>
      </section>

      {/* Results Section */}
      {(result || loading) && (
        <section className="results-section" ref={resultRef}>
          {result && !loading && (
            <div className="result-card">
              <div className="result-header">
                <span className="result-label">Diagnosis Result</span>
                <span className="result-badge">{result}</span>
              </div>
            </div>
          )}

          {/* Confidence Chart */}
          {chart && !loading && (
            <div className="chart-card">
              <h3>Confidence Analysis</h3>
              <div className="chart-wrapper">
                <Bar
                  data={chart}
                  plugins={[ChartDataLabels]}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                      padding: {
                        top: 30, // Prevent label clipping
                      }
                    },
                    plugins: {
                      legend: { display: false },
                      title: { display: false },
                      datalabels: {
                        display: true,
                        color: '#fff',
                        anchor: 'end',
                        align: 'end', // Push label further up
                        offset: -5,
                        formatter: (value) => {
                          return value + '%'; // Ensure % symbol
                        },
                        font: {
                          weight: 'bold',
                          size: 13
                        }
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 120, // Add headroom for labels
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#888' },
                      },
                      x: {
                        grid: { display: false },
                        ticks: { color: '#fff' },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* Explainability Section */}
          {(heatmap || shap) && !loading && (
            <div className="explainability-section">
              <h3>
                <span className="gradient-text">AI Explainability</span>
              </h3>
              <div className="explain-grid">
                {heatmap && (
                  <div className="explain-card">
                    <h4>Grad-CAM Heatmap</h4>
                    <p>Areas the AI focused on for diagnosis</p>
                    <img
                      src={`http://127.0.0.1:5000/${heatmap}`}
                      alt="Grad-CAM heatmap"
                    />
                  </div>
                )}
                {shap && (
                  <div className="explain-card wide">
                    <h4>SHAP Analysis</h4>
                    <p>Feature importance visualization</p>
                    <img
                      src={`http://127.0.0.1:5000/${shap}`}
                      alt="SHAP explanation"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Footer */}
      <footer className="footer">
        <p>Powered by <span className="gradient-text">Federated Learning</span></p>
      </footer>
    </div>
  );
}

export default App;
