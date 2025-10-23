#!/bin/bash

# LiveDOMSync - One-command setup
# This script installs, validates, and starts everything

set -e

echo "🚀 LiveDOMSync Setup"
echo "===================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install --silent
echo "✅ Dependencies installed"
echo ""

# Run validation
echo "🧪 Running validation tests..."
npm run validate
echo ""

# Instructions
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo ""
echo "  1. Start the sync server (in this terminal):"
echo "     npm run server"
echo ""
echo "  2. In a NEW terminal, serve the test page:"
echo "     python3 -m http.server 8000"
echo "     # or: npx http-server -p 8000"
echo ""
echo "  3. Open in browser:"
echo "     http://localhost:8000/test.html"
echo ""
echo "  4. Start editing! Changes sync automatically."
echo ""
echo "📖 Read QUICKSTART.md for detailed guide"
echo "📚 Read README.md for full documentation"
echo "🤖 Read VLM_INTEGRATION.md for AI examples"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
