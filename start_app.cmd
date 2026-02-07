@echo off
echo ==========================================
echo   FEDERATED HEALTHCARE AI - AUTO START
echo ==========================================

echo [1/3] Checking Backend Dependencies...
cd backend
pip install -r requirements.txt

echo [2/3] Starting FastAPI Backend...
start cmd /k "python main.py"

echo [3/3] Starting React Frontend...
cd ../frontend
npm install && npm start

echo ==========================================
echo   STAY HEALTHY! ALL SYSTEMS GO.
echo ==========================================
pause
