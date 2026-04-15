#!/bin/bash
# Quick cleanup script for faster development

echo "🧹 Čištění Next.js cache..."
rm -rf .next

echo "💨 Čištění build artifacts..."
rm -rf out

echo "🗑️ Čištění Node cache..."
rm -rf node_modules/.cache

echo "✅ Done! Restartujte dev server: npm run dev"
