# Database Setup

This package provides database management scripts for FolioNote, supporting multiple local development options and production deployment.

## Quick Start

### Option 1: Local Supabase (Recommended for Development)

Local Supabase provides a complete local development environment with PostgreSQL, Studio UI, and all Supabase services.

```bash
# Start local Supabase (requires Docker)
pnpm run db:start:supabase

# Push schema to local database
pnpm run db:push

# Open Drizzle Studio for database management
pnpm run db:studio

# Stop local Supabase
pnpm run db:stop:supabase
```

**Local Supabase URLs:**

- **Database**: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`
- **Studio UI**: <http://127.0.0.1:54323>
- **API**: <http://127.0.0.1:54321>

### Option 2: Docker (Fast Setup)

```bash
# Start database
pnpm run db:start:docker

# Push schema
pnpm run db:push

# Stop database
pnpm run db:stop:docker
```

### Option 3: Local PostgreSQL with Homebrew (Persistent Setup)

```bash
# Install PostgreSQL (see Prerequisites below)

# Initialize database (create user and database)
pnpm run db:init:local

# Start database
pnpm run db:start:local

# Push schema
pnpm run db:push

# Stop database
pnpm run db:stop:local
```

## Database Configuration

The database connection uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Primary connection string | - |
| `SUPABASE_DB_URL` | Supabase-specific URL (fallback) | - |
| - | Local Supabase default | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |

### Environment Setup

Create `.env` file in `apps/server/`:

```env
# Local Supabase (default, no configuration needed)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# OR Docker
DATABASE_URL=postgresql://postgres:password@localhost:5432/folio_note

# OR Local PostgreSQL (Homebrew)
DATABASE_URL=postgresql://postgres:password@localhost:5432/folio_note

# OR Production Supabase
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

## Local Supabase Development

### Prerequisites

1. **Docker Desktop** (or compatible runtime like OrbStack, Rancher Desktop)
2. **Supabase CLI** (installed as dev dependency)

### Starting Local Supabase

```bash
# From project root
pnpm run db:start

# Or from packages/db directory
cd packages/db
pnpm run db:start:supabase
```

This starts:

- PostgreSQL database on port `54322`
- Supabase Studio on port `54323`
- API server on port `54321`
- Inbucket (email testing) on port `54324`

### Stopping Local Supabase

```bash
pnpm run db:stop:supabase
```

### Viewing Local Database

1. **Supabase Studio**: <http://127.0.0.1:54323>
2. **Drizzle Studio**: `pnpm run db:studio`

### Local Supabase Status

```bash
cd packages/db
pnpm exec supabase status
```

### Reset Local Database

```bash
cd packages/db
pnpm exec supabase db reset
```

## Docker Setup

Docker setup provides an isolated PostgreSQL instance with persistent data storage.

### Start Docker Database

```bash
# From project root
pnpm run db:start:docker

# Or from packages/db directory
cd packages/db
pnpm run db:start:docker
```

### Stop Docker Database

```bash
pnpm run db:stop:docker
```

### Database Details

- **Container Name**: `folio-note-postgres`
- **Database**: `folio_note`
- **User**: `postgres`
- **Password**: `password`
- **Port**: `5432`
- **Data Volume**: Persistent volume for data storage

## Local PostgreSQL Setup (Homebrew)

Local setup uses system-installed PostgreSQL for better performance and data persistence.

### Prerequisites

#### macOS (with Homebrew)

```bash
# Install Homebrew (if not already installed)
# Visit: https://brew.sh/

/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create database (optional, script will handle this)
createdb folio_note
```

#### Linux (Ubuntu/Debian)

```bash
# Update package list
sudo apt update

# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database (optional, script will handle this)
sudo -u postgres createdb folio_note
```

#### Linux (CentOS/RHEL/Fedora)

```bash
# Install PostgreSQL
sudo dnf install postgresql-server postgresql-contrib

# Initialize database
sudo postgresql-setup initdb

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database (optional, script will handle this)
sudo -u postgres createdb folio_note
```

### Start Local Database

```bash
# From project root
pnpm run db:start:local

# Or from packages/db directory
cd packages/db
pnpm run db:start:local
```

### Stop Local Database

```bash
pnpm run db:stop:local
```

### Initialize Local Database

Before using the local PostgreSQL setup, you need to initialize the database user and database:

```bash
pnpm run db:init:local
```

This script will:

- Create the `postgres` user with password `password`
- Create the `folio_note` database
- Grant proper permissions
- Test the connection

## Database Operations

### Push Schema Changes

Directly sync schema to database (for development):

```bash
pnpm run db:push
```

### Generate Migrations

Create SQL migration files (for production):

```bash
pnpm run db:generate
```

### Run Migrations

Apply migrations to database:

```bash
pnpm run db:migrate
```

### Open Database Studio

```bash
pnpm run db:studio
```

## Troubleshooting

### Local Supabase Issues

1. **Docker not running**:

   ```bash
   # Ensure Docker is running
   docker info
   ```

2. **Port conflicts**:

   ```bash
   # Check if ports are in use
   lsof -i :54322
   lsof -i :54323
   ```

3. **Reset Supabase**:

   ```bash
   cd packages/db
   pnpm exec supabase stop --no-backup
   pnpm exec supabase start
   ```

### Connection Issues

1. **Check if database is running**:

   ```bash
   # Local Supabase
   cd packages/db && pnpm exec supabase status

   # Docker
   docker ps | grep postgres

   # Local PostgreSQL
   pg_isready -h localhost -p 5432
   ```

2. **Check environment variables**:
   - Ensure `apps/server/.env` exists and contains correct `DATABASE_URL`
   - Verify the URL format: `postgresql://user:password@host:port/database`

3. **Database not created**:
   - Docker: The database is automatically created when the container starts
   - Local Supabase: Database is created automatically on `supabase start`
   - Local PostgreSQL: The startup script will create the database if it doesn't exist

### Permission Issues (Local Setup)

If you encounter permission issues on macOS:

```bash
# Reset PostgreSQL permissions
rm -rf /usr/local/var/postgres
initdb /usr/local/var/postgres
brew services restart postgresql@16
```

On Linux:

```bash
# Switch to postgres user
sudo -u postgres psql
# Then create database and user as needed
```

## Comparison: Local Supabase vs Docker vs Local PostgreSQL

| Feature | Local Supabase | Docker | Local PostgreSQL |
|---------|---------------|--------|------------------|
| Setup Complexity | Medium | Low | High |
| Studio UI | ✅ Built-in | ❌ | ❌ |
| Full Supabase Features | ✅ | ❌ | ❌ |
| Resource Usage | High | Medium | Low |
| Persistence | ✅ | ✅ | ✅ |
| Production Parity | ✅ High | ⚠️ Medium | ⚠️ Low |
| Recommended For | Development | Quick Testing | CI/CD |
