#!/bin/bash

# PostgreSQL database initialization script
# This script sets up the initial database, user, and permissions

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

echo -e "${YELLOW}Initializing PostgreSQL database...${NC}"

# Check if we're running as the correct user (usually the user who installed PostgreSQL)
CURRENT_USER=$(whoami)
echo -e "${YELLOW}Current user: $CURRENT_USER${NC}"

# Check if PostgreSQL is running
if ! pg_isready -h localhost -p $DB_PORT >/dev/null 2>&1; then
    echo -e "${RED}PostgreSQL is not running. Please start it first.${NC}"
    echo -e "${YELLOW}Run: brew services start postgresql@17${NC}"
    exit 1
fi

# Check if we can connect as the current user (usually the database superuser)
echo -e "${YELLOW}Checking database access...${NC}"
if psql -h localhost -p $DB_PORT -U $CURRENT_USER -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
    SUPERUSER=$CURRENT_USER
    echo -e "${GREEN}Connected as superuser: $SUPERUSER${NC}"
else
    echo -e "${RED}Cannot connect as current user. Trying as 'postgres' user...${NC}"

    # Try to connect as postgres user (might require sudo)
    if sudo -u postgres psql -h localhost -p $DB_PORT -d postgres -c "SELECT 1;" >/dev/null 2>&1; then
        SUPERUSER="postgres"
        PSQL_CMD="sudo -u postgres psql -h localhost -p $DB_PORT"
        CREATEDB_CMD="sudo -u postgres createdb -h localhost -p $DB_PORT"
        CREATEUSER_CMD="sudo -u postgres createuser -h localhost -p $DB_PORT"
        echo -e "${GREEN}Connected as superuser: postgres (via sudo)${NC}"
    else
        echo -e "${RED}Cannot connect to PostgreSQL. Please check your installation.${NC}"
        echo -e "${YELLOW}You might need to run this script with proper permissions.${NC}"
        exit 1
    fi
fi

# Set the appropriate commands based on the superuser
if [[ "$SUPERUSER" == "$CURRENT_USER" ]]; then
    PSQL_CMD="psql -h localhost -p $DB_PORT -U $SUPERUSER"
    CREATEDB_CMD="createdb -h localhost -p $DB_PORT -U $SUPERUSER"
    CREATEUSER_CMD="createuser -h localhost -p $DB_PORT -U $SUPERUSER"
fi

# Create the database user if it doesn't exist
echo -e "${YELLOW}Checking if user '$DB_USER' exists...${NC}"
USER_EXISTS=$($PSQL_CMD -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER';")

if [[ "$USER_EXISTS" != "1" ]]; then
    echo -e "${YELLOW}Creating user '$DB_USER'...${NC}"
    $CREATEUSER_CMD --superuser --password $DB_USER
    echo -e "${GREEN}User '$DB_USER' created${NC}"
else
    echo -e "${GREEN}User '$DB_USER' already exists${NC}"
fi

# Set password for the user
echo -e "${YELLOW}Setting password for user '$DB_USER'...${NC}"
$PSQL_CMD -d postgres -c "ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';" >/dev/null 2>&1
echo -e "${GREEN}Password set for user '$DB_USER'${NC}"

# Create the database if it doesn't exist
echo -e "${YELLOW}Checking if database '$DB_NAME' exists...${NC}"
DB_EXISTS=$($PSQL_CMD -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME';")

if [[ "$DB_EXISTS" != "1" ]]; then
    echo -e "${YELLOW}Creating database '$DB_NAME'...${NC}"
    $CREATEDB_CMD -O $DB_USER $DB_NAME
    echo -e "${GREEN}Database '$DB_NAME' created${NC}"
else
    echo -e "${GREEN}Database '$DB_NAME' already exists${NC}"
fi

# Grant permissions
echo -e "${YELLOW}Granting permissions...${NC}"
$PSQL_CMD -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" >/dev/null 2>&1
echo -e "${GREEN}Permissions granted${NC}"

# Test the connection
echo -e "${YELLOW}Testing database connection...${NC}"
if $PSQL_CMD -d $DB_NAME -c "SELECT version();" >/dev/null 2>&1; then
    echo -e "${GREEN}Database connection successful!${NC}"
else
    echo -e "${RED}Database connection failed${NC}"
    exit 1
fi

echo -e "${GREEN}PostgreSQL database initialized successfully!${NC}"
echo -e "${YELLOW}Database URL: postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME${NC}"
