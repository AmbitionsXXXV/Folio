#!/bin/bash

# Local PostgreSQL startup script
# This script will start PostgreSQL using Homebrew on macOS or system package manager on Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database configuration
DB_NAME="ai_start"
DB_USER="postgres"
DB_PASSWORD="password"
DB_PORT="5432"

# PostgreSQL paths for Homebrew
if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew >/dev/null 2>&1; then
        # Try to find PostgreSQL binary
        if [[ -d "/opt/homebrew/opt/postgresql@17/bin" ]]; then
            export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
        elif [[ -d "/opt/homebrew/opt/postgresql@16/bin" ]]; then
            export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
        elif [[ -d "/usr/local/opt/postgresql@17/bin" ]]; then
            export PATH="/usr/local/opt/postgresql@17/bin:$PATH"
        elif [[ -d "/usr/local/opt/postgresql@16/bin" ]]; then
            export PATH="/usr/local/opt/postgresql@16/bin:$PATH"
        fi
    fi
fi

echo -e "${YELLOW}Starting local PostgreSQL database...${NC}"

# Check if PostgreSQL is already running
if pg_isready -h localhost -p $DB_PORT >/dev/null 2>&1; then
    echo -e "${GREEN}PostgreSQL is already running on port $DB_PORT${NC}"
    exit 0
fi

# Detect OS and start PostgreSQL accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS with Homebrew
    if command -v brew >/dev/null 2>&1; then
        # Check if PostgreSQL is installed
        if ! brew list | grep -q postgresql; then
            echo -e "${RED}PostgreSQL not found. Installing via Homebrew...${NC}"
            brew install postgresql@16
        fi

        if ! brew services list | grep postgresql | grep started >/dev/null 2>&1; then
            echo -e "${YELLOW}Starting PostgreSQL via Homebrew services...${NC}"
            brew services start postgresql@16
            sleep 3
        else
            echo -e "${GREEN}PostgreSQL is already running via Homebrew${NC}"
        fi
    else
        echo -e "${RED}Homebrew not found. Please install Homebrew first: https://brew.sh/${NC}"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v systemctl >/dev/null 2>&1; then
        if ! systemctl is-active --quiet postgresql; then
            echo -e "${YELLOW}Starting PostgreSQL via systemctl...${NC}"
            sudo systemctl start postgresql
            sleep 3
        else
            echo -e "${GREEN}PostgreSQL is already running via systemctl${NC}"
        fi
    else
        echo -e "${RED}systemctl not found. Please start PostgreSQL manually.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
    echo -e "${YELLOW}Please start PostgreSQL manually on your system.${NC}"
    exit 1
fi

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if pg_isready -h localhost -p $DB_PORT >/dev/null 2>&1; then
        break
    fi
    sleep 1
done

if ! pg_isready -h localhost -p $DB_PORT >/dev/null 2>&1; then
    echo -e "${RED}PostgreSQL failed to start within 30 seconds${NC}"
    exit 1
fi

# Create database if it doesn't exist
echo -e "${YELLOW}Ensuring database '$DB_NAME' exists...${NC}"
if ! psql -h localhost -p $DB_PORT -U $DB_USER -lqt | cut -d \| -f 1 | grep -qw $DB_NAME; then
    createdb -h localhost -p $DB_PORT -U $DB_USER $DB_NAME
    echo -e "${GREEN}Database '$DB_NAME' created successfully${NC}"
else
    echo -e "${GREEN}Database '$DB_NAME' already exists${NC}"
fi

echo -e "${GREEN}Local PostgreSQL database is ready!${NC}"
echo -e "${YELLOW}Database URL: postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME${NC}"
