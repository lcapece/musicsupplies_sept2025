#!/bin/bash

# Music Supplies App - Quick Deployment Script

echo "🎵 Music Supplies App - Netlify Deployment 🎵"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed. Please check for errors above."
    exit 1
fi

echo "✅ Build successful!"

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "📥 Installing Netlify CLI..."
    npm install -g netlify-cli
fi

# Deploy to Netlify
echo "🚀 Deploying to Netlify..."
echo ""
echo "Choose deployment method:"
echo "1) Production deployment (--prod)"
echo "2) Preview deployment (draft)"
read -p "Enter choice (1 or 2): " choice

case $choice in
    1)
        echo "🚀 Deploying to production..."
        netlify deploy --prod --dir=dist
        ;;
    2)
        echo "🚀 Creating preview deployment..."
        netlify deploy --dir=dist
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Post-deployment checklist:"
echo "1. Set environment variables in Netlify dashboard:"
echo "   - VITE_SUPABASE_URL"
echo "   - VITE_SUPABASE_ANON_KEY"
echo "2. Run fix_login_manual.sql in Supabase dashboard"
echo "3. Test login with account 101"
echo ""
echo "🎉 Your Music Supplies app is now live!"
