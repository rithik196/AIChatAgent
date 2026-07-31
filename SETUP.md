# Project Setup Guide (Without Docker)

This guide explains how to run the **Frontend**, **Backend**, and **Agent** locally using Python virtual environments (`venv`) and Node.js.

---

## Prerequisites

Make sure the following are installed on your machine:

- **Python 3.10+** → https://www.python.org/downloads/
- **Node.js 18+** → https://nodejs.org/
- **npm** (comes with Node.js)
- **Git** → https://git-scm.com/
- **ODBC Driver 17 for SQL Server** (required by backend for MSSQL)
  - Windows: https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server
- **Redis** running locally on port `6379`
  - Windows: Use the Windows Subsystem for Linux (WSL) or download from https://github.com/tporadowski/redis/releases
- **MongoDB** running locally on port `27017`
  - Download: https://www.mongodb.com/try/download/community

---

## Step 1 — Clone the Repository

```bash
git clone <your-github-repo-link>
cd AiAgentChat
```

---

## Step 2 — Create `.env` Files

Each service reads environment variables from a `.env` file. You need to create these manually.

### `agent/.env`

Create the file `agent/.env` with the following content:

```env
OPENAI_API_KEY=your_openai_api_key_here
MONGO_URL=mongodb://localhost:27017
PERSISTENCE_BACKEND=mongo
RLOS_ENABLE_TEMPORAL=false
```

### `backend/.env`

Create the file `backend/.env` with the following content:

```env
REDIS_URL=redis://localhost:6379/0
AGENT_URL=http://localhost:8001
MSSQL_SERVER=your_mssql_server_ip
MSSQL_PORT=1433
MSSQL_DATABASE=sacom
MSSQL_USERNAME=sa
MSSQL_PASSWORD=your_password
MSSQL_ENCRYPT=no
MSSQL_TRUST_SERVER_CERTIFICATE=yes
```

### `frontend/.env.local`

Create the file `frontend/.env.local` with the following content:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Note:** Never commit `.env` files to GitHub. They contain secrets and credentials.

---

## Step 3 — Set Up the Agent (Python)

Open a terminal and run:

```bash
cd agent

# Create virtual environment
python -m venv .venv

# Activate it
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the agent server
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

The agent will be available at: `http://localhost:8001`

---

## Step 4 — Set Up the Backend (Python)

Open a **new terminal** and run:

```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate it
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend will be available at: `http://localhost:8000`

---

## Step 5 — Set Up the Frontend (Node.js)

Open a **new terminal** and run:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: `http://localhost:3000`

---

## Step 6 — Start Order Summary

Always start services in this order:

| Order | Service   | Port  | Command                                  |
|-------|-----------|-------|------------------------------------------|
| 1     | Redis     | 6379  | `redis-server` (or start via WSL/service)|
| 2     | MongoDB   | 27017 | `mongod` (or start via service)          |
| 3     | Agent     | 8001  | `uvicorn main:app --port 8001 --reload`  |
| 4     | Backend   | 8000  | `uvicorn main:app --port 8000 --reload`  |
| 5     | Frontend  | 3000  | `npm run dev`                            |

---

## What to Add to `.gitignore`

The root `.gitignore` already covers many things, but make sure the following are present across the repo.

### Root `.gitignore` — add these if missing:

```gitignore
# Python virtual environments
.venv/
venv/
env/

# Python cache
__pycache__/
*.pyc
*.pyo
*.pyd

# Environment files (contain secrets)
.env
.env.local
.env.*.local

# Persistent data / generated files
.data/

# IDE / OS files
.vscode/
.idea/
.DS_Store
Thumbs.db
```

### `frontend/.gitignore` — add these if missing:

```gitignore
# Environment files
.env
.env.local
.env.*.local

# Next.js build output
/.next/
/out/
/build

# Node modules
/node_modules

# Debug logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### `agent/.gitignore` — add these if missing:

```gitignore
.venv/
venv/
__pycache__/
*.pyc
.env
.data/
```

### `backend/.gitignore` — add these if missing:

```gitignore
.venv/
venv/
__pycache__/
*.pyc
.env
generated_documents/
```

---

## Troubleshooting

- **`ModuleNotFoundError`** — Make sure you activated the `.venv` before running uvicorn.
- **`Connection refused` on port 6379** — Redis is not running. Start Redis first.
- **`Connection refused` on port 27017** — MongoDB is not running. Start MongoDB first.
- **ODBC error on backend** — Install "ODBC Driver 17 for SQL Server" from Microsoft's website.
- **Frontend shows API errors** — Make sure backend is running on port `8000` and `NEXT_PUBLIC_API_URL` is set correctly in `frontend/.env.local`.
- **Agent not responding** — Confirm `OPENAI_API_KEY` is set in `agent/.env` and is valid.
