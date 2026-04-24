# API Contracts
## IRIS — Intelligent Resource Inference Scheduler
**Version:** 2.0 | **Author:** Devraj Tripathi | **Date:** April 2026

---

## 1. Overview

All endpoints are served by FastAPI at `http://localhost:8000`. CORS is enabled for `http://localhost:5173` (Vite dev) and `http://localhost:3000`.

Auto-generated Swagger documentation available at `http://localhost:8000/docs`.

**Base URL:** `http://localhost:8000/api`

**Content-Type:** `application/json` for all requests and responses.

---

## 2. Endpoints

---

### 2.1 POST /api/run

**Purpose:** Execute the full IRIS pipeline. Single endpoint that orchestrates data ingestion, AI enrichment, fuzzy scoring, simulation, and metrics computation.

**Request Body:**

```json
{
  "mode": "pure",
  "source": "simulated",
  "n_processes": 10,
  "time_quantum": 4,
  "preset": null
}
```

| Field | Type | Required | Values | Default |
|-------|------|----------|--------|---------|
| mode | string | Yes | "pure" or "ai" | "pure" |
| source | string | Yes | "live" or "simulated" | "simulated" |
| n_processes | integer | No | 5–30 | 10 |
| time_quantum | integer | No | 1–20 | 4 |
| preset | string or null | No | "heavy_cpu", "mixed_load", "io_intensive", null | null |

**Notes:**
- If `preset` is provided, `source` is ignored — preset overrides data source
- If `source` is "live", `n_processes` is used as limit for psutil
- If `mode` is "pure", Groq/Gemini are never called regardless of availability

---

**Response — 200 OK:**

```json
{
  "meta": {
    "mode": "ai",
    "source": "simulated",
    "active_ai": "gemini",
    "n_processes": 10,
    "time_quantum": 4,
    "timestamp": "2026-04-10T14:32:00Z"
  },
  "processes": [
    {
      "pid": 1001,
      "name": "python.exe",
      "burst_time": 42.3,
      "arrival_time": 0.0,
      "priority": 7,
      "cpu_percent": 45.2,
      "memory_percent": 3.1,
      "workload_type": "cpu_bound",
      "behavior_score": 0.82,
      "burst_confidence": "high",
      "reasoning": "Python processes running compute-heavy scripts are typically CPU-bound.",
      "scheduling_score": 7.4,
      "rule_log": [
        "R01: waiting_time[high] & priority[high] → very_high [0.71]",
        "R05: priority[high] & burst[short] → high [0.45]",
        "R09: behavior[cpu_bound] & waiting_time[high] → high [0.38]"
      ]
    }
  ],
  "results": {
    "iris": {
      "algorithm": "IRIS",
      "gantt": [
        { "pid": 1001, "name": "python.exe", "start": 0.0, "end": 42.3, "color": "#6366f1" }
      ],
      "process_metrics": [
        { "pid": 1001, "waiting_time": 0.0, "turnaround_time": 42.3, "completion_time": 42.3, "starved": false }
      ]
    },
    "round_robin": {
      "algorithm": "Round Robin",
      "gantt": [],
      "process_metrics": []
    },
    "sjf": {
      "algorithm": "SJF",
      "gantt": [],
      "process_metrics": []
    }
  },
  "metrics": {
    "iris": {
      "avg_waiting_time": 12.4,
      "avg_turnaround_time": 54.7,
      "cpu_utilization": 94.2,
      "fairness_index": 0.91,
      "starved_count": 0
    },
    "round_robin": {
      "avg_waiting_time": 18.7,
      "avg_turnaround_time": 61.0,
      "cpu_utilization": 91.5,
      "fairness_index": 0.87,
      "starved_count": 2
    },
    "sjf": {
      "avg_waiting_time": 9.1,
      "avg_turnaround_time": 51.4,
      "cpu_utilization": 96.0,
      "fairness_index": 0.73,
      "starved_count": 3
    },
    "winner": {
      "avg_waiting_time": "SJF",
      "avg_turnaround_time": "SJF",
      "cpu_utilization": "SJF",
      "fairness_index": "IRIS",
      "starved_count": "IRIS"
    }
  },
  "research_summary": "In this simulation of 10 mixed-load processes, IRIS demonstrated superior fairness (J=0.91) compared to SJF (J=0.73), successfully preventing all 3 starvation events that occurred under classical algorithms..."
}
```

---

**Response — 400 Bad Request:**

```json
{
  "detail": "psutil returned 0 valid processes. Switch to simulated mode."
}
```

**Response — 422 Unprocessable Entity:**

```json
{
  "detail": [
    {
      "loc": ["body", "mode"],
      "msg": "value is not a valid enum member; permitted: 'pure', 'ai'",
      "type": "type_error.enum"
    }
  ]
}
```

**Response — 500 Internal Server Error:**

```json
{
  "detail": "Fuzzy engine initialization failed. Check numpy version (must be <2.0)."
}
```

---

### 2.2 GET /api/health

**Purpose:** System health check. Returns current backend status, available services, and fuzzy engine state.

**Request:** No body.

**Response — 200 OK:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "services": {
    "gemini": "available",
    "groq": "available",
    "psutil": "available",
    "fuzzy_engine": "initialized"
  },
  "modes_available": ["pure", "ai"],
  "sources_available": ["live", "simulated"]
}
```

**Service status values:** `"available"` | `"unavailable"` | `"not_configured"`

---

### 2.3 GET /api/presets/{name}

**Purpose:** Retrieve a predefined process queue without running the full pipeline. Used by frontend to preview preset contents before simulation.

**Path Parameter:**

| Parameter | Values |
|-----------|--------|
| name | "heavy_cpu", "mixed_load", "io_intensive" |

**Response — 200 OK:**

```json
{
  "preset": "heavy_cpu",
  "description": "Compute-intensive workload simulating a build system or scientific computation job.",
  "n_processes": 10,
  "processes": [
    {
      "pid": 1001,
      "name": "gcc",
      "burst_time": 78.4,
      "arrival_time": 0.0,
      "priority": 8,
      "cpu_percent": 82.1,
      "memory_percent": 5.4
    }
  ]
}
```

**Response — 404 Not Found:**

```json
{
  "detail": "Preset 'unknown_name' not found. Available presets: heavy_cpu, mixed_load, io_intensive"
}
```

---

## 3. Common Response Fields

### meta object

| Field | Type | Description |
|-------|------|-------------|
| mode | string | "pure" or "ai" — actual mode used |
| source | string | "live", "simulated", or "preset" |
| active_ai | string | "gemini", "groq", "heuristic", "none" |
| n_processes | integer | Number of processes in simulation |
| time_quantum | integer | RR time quantum used in ms |
| timestamp | string | ISO 8601 UTC timestamp |

### GanttEntry object

| Field | Type | Description |
|-------|------|-------------|
| pid | integer | Process ID |
| name | string | Process name |
| start | float | Start time in ms |
| end | float | End time in ms |
| color | string | Hex color code — consistent per PID across all algorithms |

### MetricsRecord object

| Field | Type | Description |
|-------|------|-------------|
| avg_waiting_time | float | Average waiting time in ms, 2 decimal places |
| avg_turnaround_time | float | Average turnaround time in ms, 2 decimal places |
| cpu_utilization | float | CPU utilization percentage, 2 decimal places |
| fairness_index | float | Jain's Fairness Index [0.0, 1.0], 4 decimal places |
| starved_count | integer | Number of processes flagged as starved |

---

## 4. CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 5. Frontend Integration Notes

**Single API call pattern:**
The frontend makes exactly one POST /api/run call per simulation. All 6 UI panels are populated from the single response object. No sequential or dependent calls needed.

**Color consistency:**
The backend assigns hex colors to PIDs in the response. Frontend uses these colors directly for Gantt chart bars — same color per PID across all three algorithm charts.

**Error handling in React:**
```javascript
try {
  const response = await fetch('/api/run', { method: 'POST', body: JSON.stringify(params) });
  if (!response.ok) {
    const error = await response.json();
    // Display error.detail in UI
  }
  const data = await response.json();
  // Populate all panels from data
} catch (e) {
  // Network error — show connection error badge
}
```

**Active AI badge logic:**
```javascript
const badgeText = {
  "gemini":    "AI Enhanced — Gemini 2.0 Flash",
  "groq":      "AI Enhanced — Groq Fallback",
  "heuristic": "Pure Fuzzy Mode — Heuristic Classifier",
  "none":      "Pure Fuzzy Mode"
}[data.meta.active_ai];
```
