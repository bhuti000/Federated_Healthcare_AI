import requests
import os

url = "http://127.0.0.1:5000/predict/brain"
file_path = os.path.join("uploads", "Te-gl_0010.jpg")

if not os.path.exists(file_path):
    print(f"File not found: {file_path}")
    exit(1)

print(f"Sending {file_path} to {url} with deep_scan=true...")

with open(file_path, "rb") as f:
    files = {"image": f}
    data = {"deep_scan": "true"}
    try:
        response = requests.post(url, files=files, data=data)
        print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            json_resp = response.json()
            print("Response JSON keys:", json_resp.keys())
            print("SHAP URL:", json_resp.get("shap"))
            print("Heatmap URL:", json_resp.get("heatmap"))
        else:
            print("Response Text:", response.text)
    except Exception as e:
        print(f"Request failed: {e}")
