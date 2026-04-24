#!/bin/bash

# AI Agriculture Assistant - Start Script
# This script sets up and starts the full application

set -e

echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           AI Agriculture Assistant - Setup & Start            ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Step 1: Clean up ports
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 1: Cleaning up ports (3000 and 3001)..."
echo "════════════════════════════════════════════════════════════════"

cleanup_port() {
    local port=$1
    local pid=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pid" ]; then
        print_warning "Killing process on port $port (PID: $pid)"
        kill -9 $pid 2>/dev/null || true
        sleep 1
    else
        print_status "Port $port is free"
    fi
}

cleanup_port 3000
cleanup_port 3001

# Step 2: Check prerequisites
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 2: Checking prerequisites..."
echo "════════════════════════════════════════════════════════════════"

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi
print_status "Node.js $(node --version) found"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm and try again."
    exit 1
fi
print_status "npm $(npm --version) found"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL CLI not found. Make sure PostgreSQL is running."
else
    print_status "PostgreSQL CLI found"
fi

# Step 3: Check/Create .env file
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 3: Checking environment configuration..."
echo "════════════════════════════════════════════════════════════════"

if [ ! -f .env ]; then
    print_warning ".env file not found. Creating default .env file..."
    cat > .env << 'EOF'
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_agriculture
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_agriculture
DB_USER=postgres
DB_PASSWORD=postgres

# Server Configuration
PORT=3001
NODE_ENV=development

# OpenRouter AI Configuration
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=anthropic/claude-haiku-4.5

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_for_agriculture_app_2024

# Demo Credentials (for auto-populate on login page)
DEMO_EMAIL=demo@agriculture.ai
DEMO_PASSWORD=demo123456
EOF
    print_status ".env file created"
else
    print_status ".env file exists"
fi

# Load environment variables
export $(grep -v '^#' .env | xargs)

# Step 4: Setup PostgreSQL Database
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 4: Setting up PostgreSQL database..."
echo "════════════════════════════════════════════════════════════════"

# Check if PostgreSQL is running
if pg_isready -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} &> /dev/null; then
    print_status "PostgreSQL is running"
else
    print_warning "PostgreSQL might not be running. Attempting to start..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
    fi
    sleep 2
fi

# Create database if it doesn't exist
print_info "Creating database '${DB_NAME:-ai_agriculture}' if not exists..."
createdb -h ${DB_HOST:-localhost} -p ${DB_PORT:-5432} -U ${DB_USER:-postgres} ${DB_NAME:-ai_agriculture} 2>/dev/null || print_warning "Database may already exist"

print_status "Database setup complete"

# Step 5: Install backend dependencies
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 5: Installing backend dependencies..."
echo "════════════════════════════════════════════════════════════════"

npm install
print_status "Backend dependencies installed"

# Step 6: Install frontend dependencies
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 6: Installing frontend dependencies..."
echo "════════════════════════════════════════════════════════════════"

cd frontend
npm install
cd ..
print_status "Frontend dependencies installed"

# Step 7: Seed the database
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 7: Seeding database with sample data..."
echo "════════════════════════════════════════════════════════════════"

node backend/seed.js
print_status "Database seeded with sample data"

# Step 8: Start the application with hot reload
echo ""
echo "════════════════════════════════════════════════════════════════"
echo "Step 8: Starting application with hot reload..."
echo "════════════════════════════════════════════════════════════════"

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                   Application Starting!                       ║"
echo "╠═══════════════════════════════════════════════════════════════╣"
echo "║                                                               ║"
echo "║   Frontend:  http://localhost:3000                            ║"
echo "║   Backend:   http://localhost:3001                            ║"
echo "║                                                               ║"
echo "║   Demo Login:                                                 ║"
echo "║   Email:    ${DEMO_EMAIL:-demo@agriculture.ai}                              ║"
echo "║   Password: ${DEMO_PASSWORD:-demo123456}                                    ║"
echo "║                                                               ║"
echo "║   Press Ctrl+C to stop the application                        ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Start backend and frontend concurrently with hot reload
npm run dev
