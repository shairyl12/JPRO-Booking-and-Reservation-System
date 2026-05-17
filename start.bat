@echo off
REM J-Pro Lights and Sounds Rentals - Start Script for Windows
REM This script starts both the backend and frontend servers

echo ==========================================
echo   J-Pro Lights and Sounds Rentals
echo   Starting Application...
echo ==========================================

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Start backend in a new window
echo Starting backend server on port 5000...
start "J-Pro Backend" cmd /k "node server.js"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend development server...
npm run dev
