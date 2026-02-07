import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function Result() {
  const location = useLocation();
  const navigate = useNavigate();

  const prediction = location.state?.prediction;

  if (!prediction) {
    return (
      <div style={{ textAlign: "center", marginTop: "50px" }}>
        <h2>No result found</h2>
        <button onClick={() => navigate("/")}>Go Back</button>
      </div>
    );
  }

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Prediction Result</h1>
      <h2>{prediction}</h2>
      <button onClick={() => navigate("/")}>Try Another Image</button>
    </div>
  );
}

export default Result;
