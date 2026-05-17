#!/usr/bin/env bash
# ============================================================================
# Render Build Script
# ============================================================================
# This script runs during Render deployment
# It installs dependencies and builds the frontend
# ============================================================================

echo "=================================="
echo "  J-Pro Rentals - Render Build"
echo "=================================="

# Exit on error
set -o errexit

echo ""
echo "📦 Step 1: Installing dependencies..."
npm install

echo ""
echo "🔨 Step 2: Building frontend..."
npm run build

echo ""
echo "✅ Build complete!"
echo ""
echo "📁 Build output:"
ls -la dist/ 2>/dev/null || echo "  (dist folder will be created)"
echo ""
echo "🚀 Ready to start server..."
