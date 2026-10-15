<div align="center">

<img src="assets/hero-banner.svg" alt="Polyglot Edge Agent" width="100%">

# ⚡ Polyglot Edge Agent ⚡

<p align="center">
  <strong>Gemini-powered AI proxy with API-key authentication, cached readiness checks, and optional Supabase-backed security.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-blue?style=for-the-badge&logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/FastAPI-0.100%2B-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
  <img src="https://img.shields.io/badge/Google_Gemini-API-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google Gemini">
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase">
  <img src="https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker">
  <img src="https://img.shields.io/badge/Tests-Passing-success?style=for-the-badge&logo=pytest&logoColor=white" alt="Tests">
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#request-workflow">Workflow</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-reference">API</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#testing">Testing</a>
</p>

</div>

---

## 🚀 Overview

**Polyglot Edge Agent** is a lightweight, high-performance FastAPI-based proxy designed to bridge client applications (like browser extensions) securely to powerful AI inference engines. 

> [!NOTE]
> **Active Provider Status:** Google Gemini is the fully integrated active provider. Any reference code for alternative providers in `backend/` remains strictly as legacy structure unless explicitly initialized.

<img src="assets/performance-stats.svg" alt="Project capability highlights" width="100%">

Architecture

<img src="assets/Polyglot%20Edge%20Agent%20System%20Architecture.png" alt="Polyglot Edge Agent system architecture" width="100%">

<details>
<summary><strong>Expand the text architecture diagram</strong></summary>

flowchart TD
    C["Client / Browser Extension"] --> API["FastAPI application"]
    API --> AUTH["API-key / Bearer authentication"]
    AUTH --> GUARD["Request validation and safety checks"]
    GUARD --> PROXY["Proxy request handling"]
    PROXY --> GEM["Google Gemini API"]
    API -. optional database-backed auth .-> DB[("Supabase PostgreSQL")]
    DB --- U["users"]
    DB --- K["api_keys"]
    DB --- L["usage_logs"]
    API --> H["/health"]
    API --> R["/ready"]

This is a high-level overview. Check the implementation in backend/ for the exact request flow.

</details>

Request workflow

<img src="assets/workflow-pipeline.svg" alt="Request workflow pipeline" width="100%">


## ⚡ Quick Start

<details>
<summary>1️⃣ Clone the repository</summary>

```bash
git clone https://github.com/<YOUR-USERNAME>/polyglot-edge-agent.git
cd polyglot-edge-agent
```
</details>

<details>
<summary>2️⃣ Create environment & install dependencies</summary>

```bash
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```
</details>

<details>
<summary>3️⃣ Configure environment variables</summary>

```bash
Copy-Item .env.example .env
```

- Set `GEMINI_API_KEY` and `GEMINI_MODEL`
- Optionally set `DATABASE_URL` for Supabase authentication
- ⚠️ Never commit `.env` or real secrets
</details>

<details>
<summary>4️⃣ Start the API</summary>

```bash
.\.venv\Scripts\python.exe -m uvicorn backend.api:app --host 127.0.0.1 --port 8000
```

Local endpoints:
- `/health` → Process availability
- `/ready` → Gemini readiness check
- `/docs` → Swagger UI
- `/openapi.json` → OpenAPI schema
</details>

---

## 🔑 Authentication

- `POST /v1/proxy/chat` requires `X-API-Key` or Bearer token when `POLYGLOT_API_KEY` is configured.
- Always requires authentication in **production** (`POLYGLOT_ENV=production`).
- Supabase-backed authentication hashes API keys with SHA-256.

Provision a key interactively:

```bash
.\.venv\Scripts\python.exe -m backend.provision_api_key
```

---

## 🧩 API Reference

| Endpoint          | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| `GET /health`     | Reports process availability only                                       |
| `GET /ready`      | Checks Gemini configuration and caches result                           |
| `POST /v1/proxy/chat` | Submits inference request (requires authentication)                 |

Example request:

```http
POST /v1/proxy/chat
Content-Type: application/json
X-API-Key: YOUR_API_KEY
```

---

## 🐳 Deployment with Docker

```bash
docker build -t polyglot-edge-agent .
docker run --rm -p 8000:8000 --env-file .env polyglot-edge-agent
```

✅ Supply secrets (`GEMINI_API_KEY`, `DATABASE_URL`) via your platform’s secret manager.

---

## 🛡️ Security Notes

- Never commit `.env`, API keys, or credentials
- Rotate exposed credentials immediately
- Use HTTPS in production
- Use high-entropy API keys per environment

---

## 📂 Repository Structure

```plaintext
polyglot-edge-agent/
├── assets/                     # Images and diagrams
├── backend/                    # FastAPI app and tests
│   ├── api.py                  # Main gateway
│   ├── context_manager.py      # Context budgeting
│   ├── database.py             # Supabase SQLAlchemy setup
│   ├── decider_core.py         # Local model routing + guardrails
│   ├── models.py               # ORM models
│   ├── provision_api_key.py    # Local key provisioning
│   └── test_*.py               # Backend tests
├── extension/                  # Chrome browser extension
├── src/                        # React / Vite dashboard (App.tsx)
├── public/                     # Static assets for UI
├── .dockerignore
├── .env.example                # Template only — no real secrets
├── .gitignore
├── Dockerfile
├── index.html                  # Vite entry point
├── package.json                # Frontend dependencies
├── render.yaml                 # Render deployment blueprint
├── requirements.txt            # Python dependencies
├── start.bat                   # One-command Windows startup
├── tsconfig.json
└── vite.config.ts              # Vite + proxy config
```

---

## 🖥️ Local Dashboard (UI)

The project includes a React/Vite dashboard served on **http://localhost:8443**.

**Prerequisites:** Node.js 18+ must be installed.

**One-command startup (Windows):**

```bat
start.bat
```

This script:
- Checks for the `.venv` Python environment and Node.js
- Starts FastAPI on `http://127.0.0.1:8000`
- Waits for the backend to be healthy
- Starts the Vite dev server on `http://localhost:8443`
- Prints the dashboard URL when both services are ready
- Runs each service in its own console window

**Manual startup:**

```powershell
# Terminal 1 — backend
.\.venv\Scripts\python.exe -m uvicorn backend.api:app --host 127.0.0.1 --port 8000

# Terminal 2 — frontend
npm run dev
```

Dashboard URL: **http://localhost:8443**

**Dashboard pages:**

| Page | What it does |
|---|---|
| Overview | Project status and demo metrics |
| AI Playground | Live chat with the real `/v1/proxy/chat` endpoint |
| System Health | Live `/health` and `/ready` checks |
| Settings | API endpoint and key configuration (browser local storage) |
| Help & Documentation | Setup guide and troubleshooting |

> **Security note:** The AI Playground stores the X-API-Key in browser `localStorage` for convenience in local development. This is not a secure credential store. For production use, keep API keys server-side only.

**Vite proxy:** The dev server proxies `/v1`, `/health`, and `/ready` to the FastAPI backend on port 8000. No CORS configuration changes are needed for local development.

---

## 🧪 Testing

Run backend tests:

```bash
.\.venv\Scripts\python.exe -m pytest backend -v
```

---

## 🛠️ Roadmap

- ✅ FastAPI proxy foundation  
- ✅ Gemini provider integration  
- ✅ API-key authentication options  
- ✅ Cached readiness verification  
- ✅ Docker & Render configs  
- 🔜 CI/CD automation  
- 🔜 Provider-independent routing & observability  
- 🔜 Versioned releases  

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch  
3. Add/update tests  
4. Run test suite  
5. Open a PR  

⚠️ Do not include credentials or private data in contributions.

---

## 📜 License

No license specified yet. Add a `LICENSE` file before describing the project as open source.

---

<div align="center">

`[Looks like the result wasn't safe to show. Let's switch things up and try something else!]`

✨ *Polyglot Edge Agent — bridging AI inference with secure, scalable APIs* ✨

</div>
```

---

👉 This version makes your README **interactive** with collapsible sections, **animated badges**, and clear visual hierarchy. Would you like me to also add **animated architecture diagrams** (using Mermaid.js) so readers can see the system flow dynamically?
