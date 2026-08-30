#!/bin/bash
# =============================================================================
# Vercel Build Script
# =============================================================================
# This script:
# 1. Compiles the TypeScript server
# 2. Builds the React client
# 3. Copies the client build to the root public/ directory for Vercel
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLIENT_DIR="$ROOT_DIR/client"
PUBLIC_DIR="$ROOT_DIR/public"

echo "🔨 Building server..."
cd "$SCRIPT_DIR"
npx tsc

echo "🔨 Building client..."
cd "$CLIENT_DIR"
npm run build

echo "📦 Copying client build to public/..."
rm -rf "$PUBLIC_DIR"
mkdir -p "$PUBLIC_DIR"
cp -r "$CLIENT_DIR/dist/"* "$PUBLIC_DIR/"

echo ""
echo "✅ Vercel build complete!"
echo "   Server:  $SCRIPT_DIR/dist/"
echo "   Client:  $PUBLIC_DIR/"
echo ""
