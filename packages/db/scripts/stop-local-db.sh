#!/bin/bash

# Local PostgreSQL stop script
# This script will stop PostgreSQL using Homebrew on macOS or system package manager on Linux

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Stopping local PostgreSQL database...${NC}"

# Detect OS and stop PostgreSQL accordingly
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS with Homebrew
    if command -v brew >/dev/null 2>&1; then
        if brew services list | grep postgresql | grep started >/dev/null 2>&1; then
            echo -e "${YELLOW}Stopping PostgreSQL via Homebrew services...${NC}"
            brew services stop postgresql@16
            echo -e "${GREEN}PostgreSQL stopped successfully${NC}"
        else
            echo -e "${GREEN}PostgreSQL is not running${NC}"
        fi
    else
        echo -e "${RED}Homebrew not found.${NC}"
        exit 1
    fi
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    if command -v systemctl >/dev/null 2>&1; then
        if systemctl is-active --quiet postgresql; then
            echo -e "${YELLOW}Stopping PostgreSQL via systemctl...${NC}"
            sudo systemctl stop postgresql
            echo -e "${GREEN}PostgreSQL stopped successfully${NC}"
        else
            echo -e "${GREEN}PostgreSQL is not running${NC}"
        fi
    else
        echo -e "${RED}systemctl not found. Please stop PostgreSQL manually.${NC}"
        exit 1
    fi
else
    echo -e "${RED}Unsupported OS: $OSTYPE${NC}"
    echo -e "${YELLOW}Please stop PostgreSQL manually on your system.${NC}"
    exit 1
fi
