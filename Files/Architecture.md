# System Architecture Document
## IRIS — Intelligent Resource Inference Scheduler
**Version:** 2.0 | **Author:** Devraj Tripathi | **Date:** April 2026

---

## 1. Architectural Philosophy

IRIS is designed around three non-negotiable principles:

**Separation of Concerns** — Frontend knows nothing about fuzzy logic. Backend knows nothing about rendering. Each layer has one job.

**Fault Isolation** — Any single component can fail without taking down the system. Gemini fails → Groq activates. Groq fails → pure fuzzy activates. The scheduler always runs.

**Explainability First** — Every scheduling decision must trace back to a human-readable fuzzy rule. Black box outputs are rejected at the design level.

---

## 2. High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                                │
│         Stitch + Tailwind CSS + Recharts                        │
│                                                                  │
│  [Control Panel] [Process Table] [Fuzzy Explorer]               │
│  [Gantt Charts]  [Metrics Panel] [Research Summary]             │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP REST (JSON)
                           │ POST /api/run
                           │ GET  /api/health
                           │ GET  /api/presets/{name}
┌──────────────────────────▼──────────────────────────────────────┐
│                    FASTAPI BACKEND                               │
│                      main.py                                     │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │ data_layer  │  │gemini_engine │  │    fuzzy_engine       │  │
│  │             │  │              │  │                       │  │
│  │ • psutil    │  │ • Gemini 2.0 │  │ • Antecedents         │  │
│  │ • generator │  │ • Groq 3.3   │  │ • Rule Base (12)      │  │
│  │ • presets   │  │ • heuristic  │  │ • Mamdani Inference   │  │
│  │ • normalizer│  │ • fallback   │  │ • Centroid Defuzz     │  │
│  └──────┬──────┘  └──────┬───────┘  └──────────┬────────────┘  │
│         └────────────────┴──────────────────────┘               │
│                          │                                       │
│                 ┌────────▼────────┐                             │
│                 │   simulator.py  │                             │
│                 │                 │                             │
│                 │ • IRIS Fuzzy    │                             │
│                 │ • Round Robin   │                             │
│                 │ • SJF           │                             │
│                 └────────┬────────┘                             │
│                          │                                       │
│                 ┌────────▼────────┐                             │
│                 │   metrics.py    │                             │
│                 │                 │                             │
│                 │ • Avg Wait      │                             │
│                 │ • Turnaround    │                             │
│                 │ • CPU Util      │                             │
│                 │ • Jain's Index  │                             │
│                 │ • Starvation    │                             │
│                 └────────┬────────┘                             │
└──────────────────────────┼──────────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    EXTERNAL SERVICES    │
              │                         │
              │  Gemini 2.0 Flash API   │
              │  Groq Llama 3.3 70B     │
              └─────────────────────────┘
```

---

## 3. Component Specifications

### 3.1 Frontend — React + Stitch

**Responsibility:** Render dashboard, manage UI state, send API requests, visualize results.

**Key Components:**

| Component | Responsibility |
|-----------|---------------|
| ControlPanel | Toggles (AI, Data Source), sliders, preset buttons, Run button |
| ProcessTable | Display enriched process list with badges and scores |
| FuzzyExplorer | MF plots (Recharts), rule firing log, process selector |
| GanttPanel | Three Recharts BarChart components on shared time axis |
| MetricsPanel | Comparison table with Jain's index, bar chart visualization |
| ResearchSummary | Gemini-generated natural language analysis display |
| StatusBadge | Current operating mode indicator (Pure Fuzzy / AI Enhanced / Fallback) |

**State Management:**
- React useState for UI controls
- Single POST /api/run call populates all panels simultaneously
- No Redux needed — data flows down from one API response

---

### 3.2 Backend — FastAPI

**Responsibility:** Orchestrate the full pipeline per request. Stateless — no session storage.

**Entry Point:** `main.py`

```
Request arrives at POST /api/run
    │
    ├── Extract: mode (ai/pure), source (live/simulated), n_processes, time_quantum
    │
    ├── data_layer.get_processes(source, n_processes, preset)
    │
    ├── if mode == "ai":
    │       gemini_engine.classify(processes)  # with fallback chain
    │   else:
    │       fuzzy_engine.heuristic_classify(processes)
    │
    ├── fuzzy_engine.score(processes, mode)
    │
    ├── simulator.run_all(processes, time_quantum)
    │
    ├── metrics.compute_all(results)
    │
    └── Return unified JSON response
```

---

### 3.3 data_layer.py

**Responsibility:** Process acquisition and normalization. Single source of truth for raw data.

**Functions:**
- `get_live_processes(limit)` — psutil ingestion, filtering, normalization
- `generate_synthetic_processes(n, seed)` — reproducible random generation
- `load_preset(name)` — returns predefined process queue for Heavy CPU / Mixed / IO Intensive
- `normalize(processes)` — maps raw values to fuzzy universe ranges

**Preset Definitions:**

| Preset | Process Types | Burst Distribution | Priority Distribution |
|--------|--------------|--------------------|-----------------------|
| Heavy CPU | gcc, python, ffmpeg, blender | Exponential high mean (60ms) | Uniform high [6–10] |
| Mixed Load | chrome, mysqld, nginx, python | Exponential mid mean (40ms) | Uniform full [1–10] |
| IO Intensive | svchost, idle, dropbox, antivirus | Exponential low mean (20ms) | Uniform low [1–5] |

---

### 3.4 gemini_engine.py

**Responsibility:** AI workload classification with full fallback chain.

**Fallback Chain:**

```python
def classify(processes):
    try:
        return _call_gemini(processes)       # Primary
    except (RateLimitError, TimeoutError):
        try:
            return _call_groq(processes)     # Fallback 1
        except Exception:
            return _heuristic_classify(processes)  # Fallback 2
```

**Gemini Prompt Contract:**
```
System: OS workload analyst. Return ONLY valid JSON array. No markdown.
User:   [process list as JSON]
Schema: { pid, workload_type, behavior_score, burst_confidence, reasoning }
```

**Heuristic Classifier Logic:**
```python
name_patterns = {
    "cpu_bound": ["python", "java", "gcc", "ffmpeg", "blender", "compile"],
    "io_bound":  ["idle", "svchost", "dropbox", "antivirus", "backup"],
    "mixed":     ["chrome", "firefox", "mysqld", "nginx", "node"]
}
# Falls back to cpu_percent threshold if name not matched
```

---

### 3.5 fuzzy_engine.py

**Responsibility:** Mamdani fuzzy inference. Core intelligence of IRIS.

**Input Variables:**

| Variable | Universe | MFs | Active In |
|----------|----------|-----|-----------|
| waiting_time | [0, 100] ms | low, medium, high | Always |
| burst_estimate | [0, 100] ms | short, medium, long | Always |
| priority | [0, 10] | low, medium, high | Always |
| behavior_score | [0.0, 1.0] | io_bound, mixed, cpu_bound | AI mode only |

**Output Variable:**

| Variable | Universe | MFs |
|----------|----------|-----|
| scheduling_score | [0, 10] | very_low, low, medium, high, very_high |

**Rule Base:** 12 Mamdani rules (see 08-scoring-engine-specs.md for full definitions)

**Defuzzification:** Centroid (center of gravity)

---

### 3.6 simulator.py

**Responsibility:** Execute three scheduling algorithms on identical process queues.

**IRIS Algorithm:**
Non-preemptive. Sort by scheduling_score descending. Re-score after each completion (dynamic aging — starvation prevention is native).

**Round Robin:**
Preemptive. Configurable time quantum. Standard circular queue implementation.

**SJF:**
Non-preemptive. Sort by burst_time ascending at each dispatch point.

---

### 3.7 metrics.py

**Responsibility:** Compute all performance metrics including starvation detection.

**Metrics Computed:**

| Metric | Formula |
|--------|---------|
| Waiting Time | turnaround_time − burst_time |
| Turnaround Time | completion_time − arrival_time |
| CPU Utilization | (Σ burst_time / simulation_duration) × 100 |
| Jain's Fairness Index | (Σxi)² / (n × Σxi²) where xi = CPU share |
| Starvation Flag | waiting_time > 3 × avg_burst_time |

---

## 4. Data Flow

```
User Action (toggle + Run click)
        │
        ▼
POST /api/run { mode, source, n, quantum, preset }
        │
        ▼
data_layer → raw processes []
        │
        ▼
gemini_engine → enriched processes [] (or heuristic in pure fuzzy)
        │
        ▼
fuzzy_engine → scored processes [] + rule_log []
        │
        ▼
simulator → { iris_result, rr_result, sjf_result }
        │
        ▼
metrics → { metrics_table, starvation_flags, fairness_indices }
        │
        ▼
JSON Response → React updates all 6 panels simultaneously
```

---

## 5. API Layer Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| /api/run | POST | Execute full pipeline |
| /api/health | GET | System health + current mode |
| /api/presets/{name} | GET | Load preset process queue |
| /docs | GET | Auto-generated Swagger UI |

Full contracts in `06-api-contracts.md`

---

## 6. Technology Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API framework | FastAPI | Async support, auto docs, fastest Python framework |
| Frontend | React + Recharts | Full layout control, animated charts, professional output |
| Fuzzy library | scikit-fuzzy | Only mature Python Mamdani library |
| AI primary | Gemini 2.0 Flash | Best structured JSON output, semantic process understanding |
| AI fallback | Groq Llama 3.3 70B | Fastest open model, 30 req/min free tier |
| Inference method | Mamdani | Explainability > efficiency for academic demonstration |
| Defuzzification | Centroid | Most accurate for continuous scheduling score output |
| Fairness metric | Jain's Index | Standard academic metric used in OS research literature |
