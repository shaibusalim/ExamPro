#!/bin/bash

# ExamPro Setup Script
# This script sets up the ExamPro application with database and environment

set -e

echo "================================"
echo "ExamPro Setup Script"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "Node.js version: $(node --version)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Create a PostgreSQL database (using Neon)"
echo "2. Update DATABASE_URL in .env.local"
echo "3. Run 'npm run migrate' to set up the database"
echo "4. Run 'npm run dev' to start the development server"
echo ""
