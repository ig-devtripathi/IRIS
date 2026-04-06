# Monorepo Structure
## IRIS — Intelligent Resource Inference Scheduler
**Version:** 2.0 | **Author:** Devraj Tripathi | **Date:** April 2026

---

## 1. Root Structure

```
iris/
├── backend/                    # FastAPI Python backend
├── frontend/                   # React frontend (Stitch generated)
├── docs/                       # All documentation files
├── .env                        # API keys — never commit
├── .gitignore
└── README.md
```

---

## 2. Backend Structure

```
backend/
├── main.py                     # FastAPI app entry point, route definitions
├── config.py                   # All constants and environment variables
├── data_layer.py               # psutil ingestion + synthetic generator + presets
├── gemini_engine.py            # Gemini + Groq + heuristic fallback chain
├── fuzzy_engine.py             # Mamdani FIS — membership functions + rules
├── simulator.py                # IRIS + Round Robin + SJF algorithms
├── metrics.py                  # Jain's index + starvation detection + metrics
├── requirements.txt
└── .env                        # Symlink to root .env or copy
```

### 2.1 main.py responsibilities

- Initialize FastAPI app
- Register CORS middleware
- Initialize fuzzy engine at startup (cached in module scope)
- Define all route handlers
- Orchestrate pipeline per request (calls data_layer → gemini_engine → fuzzy_engine → simulator → metrics)
- Return unified JSON response

```python
# main.py structure
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import fuzzy_engine

fis_pure = None
fis_ai = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global fis_pure, fis_ai
    fis_pure = fuzzy_engine.build_system(mode="pure")
    fis_ai   = fuzzy_engine.build_system(mode="ai")
    yield

app = FastAPI(title="IRIS API", version="1.0.0", lifespan=lifespan)

@app.post("/api/run")
async def run_simulation(params: RunRequest): ...

@app.get("/api/health")
async def health_check(): ...

@app.get("/api/presets/{name}")
async def get_preset(name: str): ...
```

### 2.2 Pydantic Models

Define in `main.py` or separate `models.py`:

```python
from pydantic import BaseModel, Field
from typing import Optional, Literal

class RunRequest(BaseModel):
    mode: Literal["pure", "ai"] = "pure"
    source: Literal["live", "simulated"] = "simulated"
    n_processes: int = Field(default=10, ge=5, le=30)
    time_quantum: int = Field(default=4, ge=1, le=20)
    preset: Optional[Literal["heavy_cpu", "mixed_load", "io_intensive"]] = None
```

---

## 3. Frontend Structure

```
frontend/
├── public/
│   └── iris-logo.svg
├── src/
│   ├── main.jsx                # React entry point
│   ├── App.jsx                 # Root component, global state
│   ├── api/
│   │   └── iris.js             # All fetch calls to FastAPI
│   ├── components/
│   │   ├── ControlPanel.jsx    # Toggles, sliders, presets, Run button
│   │   ├── StatusBadge.jsx     # Current mode indicator
│   │   ├── ProcessTable.jsx    # Enriched process data table
│   │   ├── FuzzyExplorer.jsx   # MF plots + rule firing log
│   │   ├── GanttPanel.jsx      # Three Recharts Gantt charts
│   │   ├── MetricsPanel.jsx    # Comparison table + bar chart
│   │   └── ResearchSummary.jsx # Gemini-generated analysis display
│   ├── hooks/
│   │   └── useSimulation.js    # Custom hook — manages API call state
│   └── utils/
│       ├── colors.js           # PID → color mapping utility
│       └── formatters.js       # Number formatting helpers
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.js
```

### 3.1 api/iris.js

Single file for all API calls. No fetch logic scattered across components.

```javascript
const BASE_URL = "http://localhost:8000/api";

export async function runSimulation(params) {
    const res = await fetch(`${BASE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
    });
    if (!res.ok) throw await res.json();
    return res.json();
}

export async function getHealth() {
    const res = await fetch(`${BASE_URL}/health`);
    return res.json();
}

export async function getPreset(name) {
    const res = await fetch(`${BASE_URL}/presets/${name}`);
    if (!res.ok) throw await res.json();
    return res.json();
}
```

### 3.2 hooks/useSimulation.js

```javascript
export function useSimulation() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const run = async (params) => {
        setLoading(true);
        setError(null);
        try {
            const result = await runSimulation(params);
            setData(result);
        } catch (e) {
            setError(e.detail || "Simulation failed");
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, run };
}
```

### 3.3 App.jsx State Shape

```javascript
// Global state managed in App.jsx, passed as props
const [controls, setControls] = useState({
    mode: "pure",           // "pure" | "ai"
    source: "simulated",    // "live" | "simulated"
    nProcesses: 10,
    timeQuantum: 4,
    preset: null
});
```

---

## 4. Docs Structure

```
docs/
├── README.md
├── PRD.md
├── architecture.md
├── MVP Tech Doc.md
├── system Design.md
├── 06-api-contracts.md
├── 07-monorepo-structure.md    # this file
└── 12-testing-strategy.md
```

---

## 5. Root Configuration Files

### .gitignore

```
# Python
__pycache__/
*.pyc
*.pyo
.env
venv/
.venv/

# Node
node_modules/
dist/
.next/

# OS
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
```

### .env (root — never commit)

```env
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
```

---

## 6. Package Files

### backend/requirements.txt

```
fastapi==0.110.0
uvicorn==0.29.0
scikit-fuzzy==0.4.2
numpy==1.26.4
psutil==5.9.8
google-generativeai==0.5.0
groq==0.5.0
python-dotenv==1.0.1
pandas==2.2.1
pydantic==2.6.4
```

### frontend/package.json (key dependencies)

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0"
  }
}
```

---

## 7. Development Commands

```bash
# Start backend (from /backend)
uvicorn main:app --reload --port 8000

# Start frontend (from /frontend)
npm run dev        # runs on http://localhost:5173

# Install backend deps
pip install -r requirements.txt

# Install frontend deps
npm install

# Check API docs
open http://localhost:8000/docs
```

---

## 8. Antigravity Build Instructions

When using Antigravity IDE to build the backend:

1. Read all docs in `/docs` before writing any code
2. Build in this exact order:
   - `config.py` first — all other files import from here
   - `data_layer.py` — no dependencies on other custom modules
   - `fuzzy_engine.py` — depends on config only
   - `gemini_engine.py` — depends on config only
   - `simulator.py` — depends on fuzzy_engine
   - `metrics.py` — depends on config only
   - `main.py` last — depends on all modules above
3. Ignore Streamlit references in older docs — UI is React only
4. All function signatures are defined in `MVP Tech Doc.md` — follow exactly
5. All API response schemas are defined in `06-api-contracts.md` — match exactly
