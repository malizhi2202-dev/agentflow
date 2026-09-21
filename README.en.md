# code-kit-platform

> **Full-stack AI Development Platform** — Agent Orchestration + Visual Monitoring from Requirements to Archive

![demo](./demo.gif)

> 📖 [中文版 / Chinese Version](./README.md)

---

## 📖 Table of Contents

- [Why This Project](#-why-this-project)
- [Core Advantages](#-core-advantages)
- [Competitive Analysis](#-competitive-analysis)
- [Feature Overview](#-feature-overview)
- [Technical Architecture](#-technical-architecture)
- [Architecture](#-architecture)
- [Dependencies](#-dependencies)
- [Quick Start](#-quick-start)
- [Usage Guide](#-usage-guide)
- [Project Structure](#-project-structure)
- [Configuration](#-configuration)
- [Security Model](#-security-model)
- [FAQ](#-faq)
- [Roadmap](#-roadmap)

---

## 🤔 Why This Project

From 2025 to 2026, AI agent orchestration tools have exploded — Dify, Coze, n8n, Langflow — yet they all share the same blind spots:

| Pain Point | Limitations of Existing Tools |
|------------|-------------------------------|
| **Too few edge strategies** | Most offer only 3-5 types (sequential/branch/loop). Complex scenarios (fan-out/fan-in, master-slave, dead-letter) require heavy glue code. |
| **No per-edge configuration** | Retry policies, token limits, security gates, data masking... Every platform treats edges as "pick a type and done." |
| **Visual changes don't sync to YAML** | YAML and canvas are two separate worlds. Change one, the other breaks. No platform achieves real-time bidirectional sync. |
| **Deploy and pray** | All platforms are fire-and-forget. No K8s-style reconcile loop (desired state vs. actual state → auto-heal drift). |
| **Build only, no process governance** | Requirements review, design inspection, expert gating, test acceptance... The entire software engineering lifecycle is absent from existing agent platforms. |

**code-kit-platform was born to fill these gaps.**

---

## 🎯 Core Advantages

### 1. 15 Edge Strategies (Most in the World)

```
pipeline │ fan-out │ fan-in │ map-reduce │ fork │ condition
master-slave │ parallel │ event-trigger │ human-approval
retry-fallback │ dead-letter │ sequential │ dynamic-router │ sub-orch
```

> Dify: 3-4 | Sim Studio: 3-4 | n8n: basic | **You: 15**

### 2. Per-Edge Configuration Panel

```
Each edge can be independently configured:
├─ Strategy Type + Trigger Type + Trigger Condition
├─ Security Gates: Pre-validation + Post-validation + Data Masking
├─ Token Limits: Soft Limit (warn) + Hard Limit (block) + Max Invocations
├─ Data Scope: All / Subset / Masked + Transform Expression
├─ Wait & Merge: wait_all / wait_any / wait_first / wait_n
│                merge_all / merge_first / merge_concat / merge_pick
├─ Retry Policy: Count + Backoff (fixed/exponential) + Fallback Node
├─ Timeout: Seconds + Action (degrade/skip/fail/retry)
└─ IO Schema: Input/Output JSON Schema
```

> Every competitor: pick an edge type, and that's it.

### 3. YAML ↔ Canvas Bidirectional Sync

```
Edit YAML → Canvas auto-updates
Drag on canvas → YAML auto-updates
┌──────────────────────────────────────┐
│  Single source of truth,             │
│  no manual sync, no conflicts        │
└──────────────────────────────────────┘
```

> Microsoft Foundry only added this in November 2025. You're ahead.

### 4. Reconcile Loop Declarative Scheduling

```
Desired State (YAML)  ──→  Topology Snapshot
                                  │
      ┌───────────────────────────┼─────────────────────────┐
      ▼                           ▼                         ▼
  Actual State                  Diff                    Auto-heal
  (Agent Runtime)          (Drift Detection)     (Gradual Convergence)
```

> K8s-style declarative orchestration. Every competitor is "fire and forget."

### 5. code-kit Full Development Lifecycle

```
CHANGE → REQUIREMENT → DESIGN → UI-DESIGN → TASK
                                                    ↓
  ARCHIVE ← REVIEW ← TEST ← 4-dev (coding) ←────────┘
                                    ↑
                          4-expert panel gate at each stage exit
```

> Competitors only handle "build and run." You handle the full lifecycle.

---

## 📊 Competitive Analysis

| Capability | **code-kit-platform** | Sim Studio | Langflow | Dify | n8n | Build A Harness |
|------------|:---:|:---:|:---:|:---:|:---:|:---:|
| YAML↔Canvas Bidirectional Sync | ✅ | ❌ | ❌ | ❌ | ❌ | 🔄 JSON |
| Edge Strategy Count | **15** | 3-4 | 3-4 | 3-4 | basic | 5-6 |
| Per-Edge Configuration | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reconcile Loop | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Full Dev Lifecycle | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Agent Management | ✅ | ✅ | ⚠️ | ✅ | ❌ | ✅ |
| Template Marketplace | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Observability / Tracing | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| MCP Protocol | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| Open Source | Private | Apache 2.0 | MIT | Apache 2.0 | Proprietary | MIT |

### Closest Competitors

- **[Sim Studio](https://sim.ai)** — YC-backed, 28.8K⭐, ReactFlow canvas + Mothership NL control. Edge depth far behind.
- **[Build A Harness](https://github.com/3IVIS/buildaharness)** — Canvas compiles to LangGraph/CrewAI/Mastra, 27 node types. No YAML bidirectional sync.
- **[Kumiho Construct](https://docs.rs/crate/kumiho-construct)** — Rust + YAML declarative + Neo4j graph memory. Runtime-focused, no per-edge config depth.

**Conclusion: No identical product exists on the market.**

---

## 🧩 Feature Overview

```
┌───────────────────────────────┐  ┌────────────────────────────────┐
│    code-kit Workflow Monitor   │  │        AI Dev Platform          │
│                               │  │                                │
│  • Change List + Progress     │  │  • Tool Library (Plugin/Skill/  │
│  • Expert Gate Voting Vis     │  │    MCP)                        │
│  • Artifact Viewing/Editing   │  │  • Workflows (Text + Visual)   │
│  • Runtime Session Monitor    │  │  • Agent Mgmt (LangChain/Graph) │
│  • Token Usage Stats          │  │  • Project Mgmt (Req→Exec→Done) │
│  • Git Safety Commit Tracker  │  │  • Role System + Custom Roles  │
│  • Health Check + Dead Code   │  │  • User Mgmt + RBAC            │
│                               │  │  • Audit Log                   │
└───────────────────────────────┘  └────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    Agent Orchestration Engine                      │
│                                                                   │
│  • Declarative YAML Definition (K8s-style)                        │
│  • Visual Topology Canvas (React Flow · Drag & Drop)              │
│  • YAML ↔ Canvas Bidirectional Real-time Sync                     │
│  • 15 Edge Strategies · Per-Edge Configuration Panel              │
│  • Reconcile Loop · Drift Detection · Auto-Repair                 │
│  • Priority Scheduling Queue · Gradual Convergence                │
│  • Template Marketplace · Parameterized One-Click Deploy          │
│  • Cross-Agent Trace Viewer                                       │
│  • Topology-Level Real-time Monitoring (Node Status Colors)       │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend Framework** | React + TypeScript | 18.3 / 5.5 |
| **Build Tool** | Vite | 5.4 |
| **UI Components** | Tailwind CSS + Tremor | 3.4 / 3.18 |
| **State Management** | Zustand (8 stores) | 4.5 |
| **Visual Canvas** | React Flow (@xyflow/react) | 12.x |
| **Code Editor** | CodeMirror 6 | 6.x |
| **Charts** | Recharts | 2.15 |
| **Icons** | Lucide React | 1.23 |
| **Backend Framework** | FastAPI (Python) | 0.110+ |
| **ORM** | SQLAlchemy | 2.0 |
| **Database** | SQLite / MySQL | — |
| **Cache** | Redis | 5.0 (Optional) |
| **YAML Processing** | PyYAML + jsonschema | 6.0 / 4.0 |

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **React Flow over custom canvas** | Mature node/edge library with built-in DAG layout, MiniMap, drag-and-drop |
| **Zustand over Redux** | Lightweight, zero boilerplate, React 18 concurrent-safe |
| **YAML as single source of truth** | Versionable, diffable, CI/CD-friendly, declarative semantics |
| **Name→ID stable mapping** | `agentNameToId()` prevents edge ID drift across YAML parses |
| **canvasDirtyRef guard** | Prevents infinite sync loop when manually syncing canvas→YAML |
| **SQLite default, MySQL optional** | Zero-config local dev, swappable for production |
| **X-User-Id header injection** | Transparent auth via global fetch interceptor |

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Browser (:5173)                          │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ 30 pages │ │21 comps  │ │ 8 stores │ │ React Flow    │  │
│  │ (React)  │ │(Tailwind)│ │ (Zustand)│ │ (Topo Canvas) │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘  │
│       └─────────────┴────────────┴───────────────┘          │
│                         │ fetch()                             │
│              X-User-Id header (auto-injected)                 │
└─────────────────────────┼───────────────────────────────────┘
                          │
              Vite proxy /api → :8000
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                  FastAPI (:8000)                             │
│  ┌──────────────────────┴──────────────────────────────┐    │
│  │  Auth Middleware (localhost whitelist + user inject)  │    │
│  └──────────────────────┬──────────────────────────────┘    │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐ ┌───────────┐   │
│  │20 APIs│ │14 Svc │ │7 Model│ │3 Engine│ │runtime    │   │
│  │(routes)│ │(svc)  │ │(ORM)  │ │(engine)│ │watcher    │   │
│  └───┬───┘ └───┬───┘ └───┬───┘ └───┬───┘ └─────┬─────┘   │
│      └─────────┴─────────┴─────────┴─────────────┘         │
│                         │                                    │
│              ┌──────────┴──────────┐                        │
│              │   SQLite / MySQL     │                        │
│              │   Redis (Optional)   │                        │
│              └─────────────────────┘                        │
└──────────────────────────────────────────────────────────────┘
                          │
┌─────────────────────────┼───────────────────────────────────┐
│                  Filesystem                                  │
│  .specs/   ←→   code-kit/   ←→   runtime.jsonl             │
│  (Artifacts)     (CLI Tool)       (Runtime Data)             │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
YAML Editor                  Topology Canvas (React Flow)
    │                            │
    │  onChange                  │  onNodesChange
    ▼                            ▼
  yamlContent (Zustand)    topologyState (Zustand)
    │                            │
    │  useEffect (300ms)          │  syncToYaml / handleApply
    ▼                            ▼
  yamlToTopology()          topologyToYaml()
    │                            │
    └──────────┬─────────────────┘
               ▼
         orc-sync.ts (Bidirectional Converter)
               │
               ▼
          API /apply → DB + Scheduling Queue
```

---

## 📦 Dependencies

| Dependency | Min Version | Purpose | Required |
|------------|-------------|---------|:---:|
| **Python** | 3.10+ | Backend runtime | ✅ |
| **Node.js** | 18+ | Frontend build | ✅ |
| **npm** | 9+ | Package manager | ✅ |
| **SQLite** | 3.x | Default database (built-in) | ✅ |
| **MySQL** | 8.0+ | Production database (optional) | ❌ |
| **Redis** | 5.0+ | Metrics cache (optional) | ❌ |

---

## 🚀 Quick Start

### 1. Clone

```bash
git clone <repo-url>
cd code-flow
```

### 2. Install Backend

```bash
cd code-kit-monitor/backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Install Frontend

```bash
cd ../frontend
npm install
```

### 4. Launch

```bash
# Terminal 1 — Start Backend
cd code-kit-monitor/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Start Frontend
cd code-kit-monitor/frontend
npm run dev
```

### 5. Open Browser

```
http://localhost:5173
```

First launch auto-creates SQLite database (`platform.db`). No extra config needed.

### Language Selection

The platform supports **Chinese** and **English**. Configure via environment variable:

```bash
# English
UI_LANG=en uvicorn main:app

# Chinese (default)
UI_LANG=zh uvicorn main:app
```

---

## 📘 Usage Guide

### Agent Orchestration (Core Feature)

```yaml
# 1. Write topology in YAML panel, or drag agents + connect on canvas
apiVersion: ai-platform/v1
kind: AgentOrchestration
metadata:
  name: my-pipeline
spec:
  agents:
    - name: reviewer
      kind: Agent
      spec:
        runtime: langgraph
        model: { provider: openai, name: gpt-4o }
        workflow_id: 1
  routes:
    - { from: reviewer, to: analyzer, type: pipeline }
```

```text
# 2. On the canvas:
   - Drag new nodes from the left Agent Pool
   - Connect two nodes → Edge Config panel slides in from the right
   - Configure retry policy / token limits / security gates / data masking
   - Click "Sync" → YAML auto-updates
   - Click "Apply" → Deploy to scheduling queue
```

### Workflows

```
Tool Library → Select Plugin/Skill/MCP → Create Workflow → Publish → Bind Agent
```

### Project Management

```
New Project → Input Requirements → Bind Agent + Workflow → Execute → Monitor
```

### code-kit Monitoring

```
Home → View Active Changes → Enter Detail → View Gates / Tasks / Token Usage
```

---

## 📁 Project Structure

```
code-flow/
├── code-kit/                         # code-kit CLI Tool
├── .specs/                           # Project Specs + AI Artifacts
│   ├── CONTEXT.md                    # Shared Project Context
│   ├── ARCHITECTURE.md               # Architecture Decision Records
│   └── <change-id>/                  # Per-change Artifact Directory
│       ├── CHANGE.md
│       ├── REQUIREMENT.md
│       ├── DESIGN.md
│       ├── TASK.md
│       └── ...
├── code-kit-monitor/                 # This Product (Web Dashboard)
│   ├── backend/
│   │   ├── main.py                   # FastAPI Entry + Auth Middleware
│   │   ├── config.py                 # Config (Port, CORS, Paths)
│   │   ├── database.py               # SQLAlchemy Engine + Dual Backend
│   │   ├── auth.py                   # User Auth + Password Management
│   │   ├── routes/                   # 20 API Route Modules
│   │   │   ├── orchestration_api.py  # Orchestration CRUD + apply/validate
│   │   │   ├── agents_api.py         # Agent CRUD
│   │   │   ├── workflows_api.py      # Workflow Management
│   │   │   ├── tools_api.py          # Tool Library
│   │   │   ├── metrics_api.py        # Metrics + Trace
│   │   │   ├── projects_api.py       # Project Management
│   │   │   └── ...
│   │   ├── models/                   # 7 ORM Models
│   │   ├── services/                 # 14 Business Services
│   │   │   ├── reconcile_loop.py     # K8s-style Control Loop
│   │   │   ├── runtime_watcher.py    # Filesystem Watcher
│   │   │   ├── template_service.py   # Template Rendering
│   │   │   └── ...
│   │   └── engine/                   # Engine
│   │       ├── yaml_schema.py        # YAML Validation
│   │       ├── scheduler.py          # Priority Scheduling
│   │       └── gate_registry.py      # Security Gate Registry
│   └── frontend/
│       ├── src/
│       │   ├── pages/                # 30 Page Components
│       │   │   ├── OrchestrationPage.tsx   # Orchestration Canvas
│       │   │   ├── Home.tsx               # Dashboard
│       │   │   ├── WorkflowEditor.tsx     # Workflow Editor
│       │   │   └── ...
│       │   ├── components/           # 21 Reusable Components
│       │   │   ├── OrchestrationCanvas.tsx # Topology Canvas (React Flow)
│       │   │   ├── EdgeEditor.tsx         # Edge Config Panel
│       │   │   ├── TopologyMonitor.tsx    # Topology Monitor
│       │   │   ├── TraceViewer.tsx        # Trace Viewer
│       │   │   └── ...
│       │   ├── stores/               # 8 Zustand Stores
│       │   ├── lib/
│       │   │   └── orchestration-sync.ts  # YAML ↔ Canvas Converter
│       │   └── hooks/
│       └── vite.config.ts
├── STATE.md                          # Project State (AI Entry Point)
├── CLAUDE.md                         # AI Instructions
├── README.md                         # Chinese README
└── README.en.md                      # This File (English README)
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HOST` | `127.0.0.1` | Backend listen address |
| `PORT` | `8000` | Backend port |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin |
| `DATABASE_URL` | (empty=SQLite) | MySQL connection string |
| `REDIS_URL` | (empty=skip) | Redis cache URL |
| `SPECS_DIR` | `../.specs` | code-kit artifacts directory |
| `SCAN_INTERVAL` | `5` | Filesystem scan interval (seconds) |
| `UI_LANG` | `zh` | UI language: `zh` (Chinese) or `en` (English) |

### Database Switching

```bash
# Default SQLite (zero-config)
uvicorn main:app

# Switch to MySQL
DATABASE_URL="mysql+aiomysql://root:password@localhost:3306/platform" uvicorn main:app
```

---

## 🔒 Security Model

| Layer | Mechanism |
|-------|-----------|
| **Authentication** | Password login + localStorage persistence + `X-User-Id` header auto-injection |
| **Authorization** | RBAC (admin / user) + per-user custom permissions |
| **Isolation** | owner_id data isolation + project_ids project filtering |
| **Encryption** | Agent API Key encrypted storage (`encryption_service.py`) |
| **Audit** | Full audit trail for all operations (create/update/delete/permission changes) |
| **Security Gates** | Per-edge pre/post validation (SQL injection detection, PII masking, schema validation) |
| **Network** | Default localhost whitelist, only `CORS_ORIGIN` allowed |

---

## ❓ FAQ

**Q: Why YAML over JSON?**
A: YAML is more readable, supports comments, and aligns with the K8s ecosystem. Internal JSON compilation target (`flow.json`) exists for runtime use.

**Q: Nodes outside the visible area?**
A: Auto `fitView` on canvas entry centers all nodes. Double-click the MiniMap in the bottom-right corner to quickly locate.

**Q: Sync button unresponsive?**
A: Check for the green `✅ Synced to YAML` toast in the toolbar. If the YAML panel is collapsed, sync will auto-expand it.

**Q: Edges scrambled on re-entry?**
A: Fixed in v2. Node IDs are name-based (`agentNameToId`), stable across YAML parses.

**Q: Production-ready?**
A: Currently a local development tool. For production deployment, we recommend: MySQL + Redis + HTTPS + Alembic migrations.

---

## 🗺 Roadmap

- [x] Agent Orchestration Canvas v2 (YAML↔Canvas Bidirectional Sync)
- [x] 15 Edge Strategies + Per-Edge Configuration Panel
- [x] Reconcile Loop + Scheduling Queue
- [x] Template Marketplace + Parameterized Deploy
- [x] Cross-Agent Trace Viewer
- [x] Project Management (Requirements→Execution→Delivery)
- [x] Bilingual UI (Chinese + English)
- [ ] Alembic Database Migrations
- [ ] ESLint + Prettier + Ruff Code Standards
- [ ] CI/CD Integration
- [ ] Unit + E2E Test Coverage
- [ ] Natural Language → Topology Canvas (Mothership-style)
- [ ] Canvas → Multi-Runtime Compilation (LangGraph/CrewAI/Mastra)
- [ ] MCP Server Publishing
- [ ] Docker One-Click Deploy

---

## 📄 License

Private. All rights reserved.

---

<p align="center">
  <sub>Built with React · FastAPI · React Flow · SQLAlchemy · Zustand</sub>
</p>
