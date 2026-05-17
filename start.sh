#!/bin/bash

# J-Pro Lights and Sounds Rentals - Start Script
# This script starts both the backend and frontend servers

echo "=========================================="
echo "  J-Pro Lights and Sounds Rentals"
echo "  Starting Application..."
echo "=========================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start backend in background
echo "Starting backend server on port 5000..."
node server.js &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Start frontend
echo "Starting frontend development server..."
npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
