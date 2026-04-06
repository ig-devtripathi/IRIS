# MVP Technical Documentation
## IRIS — Intelligent Resource Inference Scheduler
**Version:** 2.0 | **Author:** Devraj Tripathi | **Date:** April 2026

---

## 1. Overview

This document defines the complete technical implementation specification for IRIS. It covers environment setup, every module's public API, data contracts, configuration constants, error handling strategy, and known limitations. This is the primary reference document for Antigravity IDE during backend construction.

---

## 2. Environment Setup

### 2.1 Prerequisites

- Python 3.10+
- Node.js 18+
- Gemini API key (free tier — aistudio.google.com)
- Groq API key (free tier — console.groq.com)

### 2.2 Backend Setup

```bash
cd iris/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### 2.3 Frontend Setup

```bash
cd iris/frontend
npm install
npm run dev
```

### 2.4 requirements.txt

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

### 2.5 .env

```env
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
```

---

## 3. config.py

All constants live here. Zero magic numbers anywhere else.

```python
# API Keys
GEMINI_API_KEY: str         # from .env
GROQ_API_KEY: str           # from .env

# AI Models
GEMINI_MODEL = "gemini-2.0-flash"
GROQ_MODEL = "llama-3.3-70b-versatile"

# Simulation defaults
DEFAULT_PROCESS_COUNT = 10
DEFAULT_TIME_QUANTUM = 4        # ms
MAX_BURST_TIME = 100            # ms
MAX_ARRIVAL_TIME = 50           # ms
PRIORITY_RANGE = (1, 10)
STARVATION_THRESHOLD = 3.0      # multiplier of avg burst time

# Fuzzy universes
WAITING_TIME_UNIVERSE = (0, 100)
BURST_UNIVERSE = (0, 100)
PRIORITY_UNIVERSE = (0, 10)
BEHAVIOR_UNIVERSE = (0.0, 1.0)
SCORE_UNIVERSE = (0, 10)

# App
APP_TITLE = "IRIS — Intelligent Resource Inference Scheduler"
VERSION = "1.0.0"
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]
```

---

## 4. Module API Reference

### 4.1 data_layer.py

```python
def get_live_processes(limit: int = 15) -> list[dict]:
    """
    Fetches real processes from host OS via psutil.
    
    Filters:
        - Zombie processes (status == 'zombie')
        - System processes (pid < 10)
        - Processes with 0.0 cpu_percent on first poll (psutil warmup issue)
    
    Normalization:
        - cpu_percent → burst_time via linear map [0,100] → [5,100] ms
        - nice (Linux: -20 to +20) → priority [1,10] via affine transform
        - Windows priority class → [1,10] scale
    
    Returns list of ProcessDict (see schema below).
    Never raises — returns empty list on permission error.
    """

def generate_synthetic_processes(n: int = 10, seed: int = None) -> list[dict]:
    """
    Generates n synthetic processes with realistic distributions.
    
    Distributions:
        - burst_time: exponential(mean=40ms), clipped [5, 100]
        - arrival_time: Poisson(lambda=5), cumulative
        - priority: uniform int [1, 10]
        - cpu_percent: correlated with burst_time + Gaussian noise
        - memory_percent: uniform float [0.5, 15.0]
    
    PID range: 1001 to 1001+n
    Name pool: realistic OS process names (20+ names)
    seed=None → random each run; seed=int → reproducible
    """

def load_preset(name: str) -> list[dict]:
    """
    Returns predefined process queue for demo scenarios.
    name: "heavy_cpu" | "mixed_load" | "io_intensive"
    Returns fixed list of ProcessDict — same every call.
    Raises ValueError for unknown preset name.
    """

def normalize_processes(processes: list[dict]) -> list[dict]:
    """
    Ensures all process fields are within fuzzy universe ranges.
    Called internally by get_live_processes and generate_synthetic_processes.
    """
```

**ProcessDict Schema:**
```python
{
    "pid": int,
    "name": str,
    "burst_time": float,        # [5.0, 100.0] ms
    "arrival_time": float,      # [0.0, 50.0] ms
    "priority": int,            # [1, 10]
    "cpu_percent": float,       # [0.0, 100.0]
    "memory_percent": float     # [0.0, 100.0]
}
```

---

### 4.2 gemini_engine.py

```python
def classify(processes: list[dict], mode: str = "ai") -> tuple[list[dict], str]:
    """
    Enriches process list with workload classification.
    
    mode="ai"   → runs full fallback chain (Gemini → Groq → heuristic)
    mode="pure" → runs heuristic only (no API calls)
    
    Returns: (enriched_processes, active_mode)
    active_mode: "gemini" | "groq" | "heuristic" | "default"
    
    Never raises. Always returns valid enriched list.
    """

def _call_gemini(processes: list[dict]) -> list[dict]:
    """Internal. Calls Gemini 2.0 Flash. Raises on failure."""

def _call_groq(processes: list[dict]) -> list[dict]:
    """Internal. Calls Groq Llama 3.3 70B. Raises on failure."""

def _heuristic_classify(processes: list[dict]) -> list[dict]:
    """
    Internal. Rule-based classification using process name patterns
    and cpu_percent thresholds. Never raises. Always returns full list.
    """

def generate_research_summary(
    processes: list[dict],
    results: dict,
    metrics: dict,
    active_mode: str
) -> str:
    """
    Calls Gemini to generate 150-200 word natural language analysis.
    Includes: which algorithm won, why, dominant fuzzy rules, workload pattern.
    Returns empty string on API failure — UI hides summary panel gracefully.
    """
```

**EnrichedProcessDict — additional fields:**
```python
{
    # All ProcessDict fields +
    "workload_type": str,       # "cpu_bound" | "io_bound" | "mixed"
    "behavior_score": float,    # [0.0, 1.0]
    "burst_confidence": str,    # "low" | "medium" | "high"
    "reasoning": str            # One sentence from AI or heuristic
}
```

---

### 4.3 fuzzy_engine.py

```python
def build_system(mode: str = "ai") -> ctrl.ControlSystemSimulation:
    """
    Constructs and returns Mamdani control system.
    
    mode="ai"   → 4 antecedents (includes behavior_score)
    mode="pure" → 3 antecedents (excludes behavior_score)
    
    Called once at app startup. Cached in module scope.
    Returns instantiated ControlSystemSimulation.
    """

def score_processes(
    processes: list[dict],
    sim: ctrl.ControlSystemSimulation,
    mode: str = "ai"
) -> list[dict]:
    """
    Runs Mamdani inference on each process.
    
    For each process:
    1. Normalize inputs to fuzzy universes
    2. Run ControlSystemSimulation
    3. Extract crisp scheduling_score
    4. Log top 3 fired rules with activation values
    
    Returns process list with added fields:
        scheduling_score: float [0, 10]
        rule_log: list[str]  — human-readable fired rules
        waiting_time: float  — initialized to 0.0 (updated by simulator)
    """

def heuristic_classify(processes: list[dict]) -> list[dict]:
    """
    Adds behavior_score and workload_type using name/cpu pattern matching.
    Used in pure fuzzy mode AND as fallback in AI mode.
    """
```

**Membership Function Definitions:**

```python
# waiting_time [0, 100]
low    = trimf([0,   0,  40])
medium = trimf([20, 50,  80])
high   = trimf([60, 100, 100])

# burst_estimate [0, 100]
short  = trimf([0,   0,  35])
medium = trimf([20, 50,  80])
long   = trimf([65, 100, 100])

# priority [0, 10]
low    = trimf([0,  0,  4])
medium = trimf([3,  5,  7])
high   = trimf([6, 10, 10])

# behavior_score [0.0, 1.0] — AI mode only
io_bound = trimf([0.0, 0.0, 0.4])
mixed    = trimf([0.3, 0.5, 0.7])
cpu_bound= trimf([0.6, 1.0, 1.0])

# scheduling_score [0, 10] — output
very_low  = trimf([0,   0,  2.5])
low       = trimf([1.5, 3,  4.5])
medium    = trimf([3.5, 5,  6.5])
high      = trimf([5.5, 7,  8.5])
very_high = trimf([7.5, 10, 10])
```

**Full Rule Base (12 rules):**

```python
# Tier 1 — Urgency (starvation prevention)
R01: waiting_time[high]   & priority[high]    → score[very_high]
R02: waiting_time[high]   & burst[short]      → score[very_high]
R03: waiting_time[high]   & burst[medium]     → score[high]
R04: waiting_time[medium] & priority[high]    → score[high]

# Tier 2 — Efficiency
R05: priority[high]  & burst[short]           → score[high]
R06: priority[medium]& burst[short]           → score[medium]
R07: priority[low]   & burst[long]            → score[low]
R08: waiting_time[low] & burst[long]          → score[very_low]

# Tier 3 — Behavior-aware (AI mode — behavior_score active)
R09: behavior[cpu_bound] & waiting_time[high] → score[high]
R10: behavior[io_bound]  & priority[medium]   → score[medium]
R11: behavior[mixed]     & waiting_time[medium]→ score[medium]
R12: priority[low]       & waiting_time[low]  → score[very_low]
```

Note: In pure fuzzy mode, R09–R11 are replaced with:
```python
R09p: burst[short]  & priority[medium] → score[medium]
R10p: burst[medium] & priority[low]    → score[low]
R11p: burst[long]   & priority[high]   → score[medium]
```

---

### 4.4 simulator.py

```python
def run_all(
    processes: list[dict],
    time_quantum: int = 4
) -> dict:
    """
    Runs all three schedulers on identical process queue.
    Returns combined result dict.
    """

def run_iris(processes: list[dict]) -> SchedulerResult:
    """
    Non-preemptive. Sort by scheduling_score descending.
    Re-scores after each completion (dynamic aging).
    Starvation impossible — waiting_time feeds back into fuzzy score.
    """

def run_round_robin(processes: list[dict], quantum: int) -> SchedulerResult:
    """Standard preemptive RR with circular ready queue."""

def run_sjf(processes: list[dict]) -> SchedulerResult:
    """Non-preemptive SJF. Sort by burst_time at each dispatch."""
```

**SchedulerResult Schema:**
```python
{
    "algorithm": str,               # "IRIS" | "Round Robin" | "SJF"
    "gantt": [
        {
            "pid": int,
            "name": str,
            "start": float,         # ms
            "end": float,           # ms
            "color": str            # hex color — consistent per PID
        }
    ],
    "process_metrics": [
        {
            "pid": int,
            "waiting_time": float,
            "turnaround_time": float,
            "completion_time": float,
            "starved": bool         # True if waiting_time > threshold
        }
    ]
}
```

---

### 4.5 metrics.py

```python
def compute_all(results: dict) -> dict:
    """
    Computes all performance metrics for all three algorithms.
    results: { "iris": SchedulerResult, "rr": SchedulerResult, "sjf": SchedulerResult }
    """

def jains_fairness_index(cpu_shares: list[float]) -> float:
    """
    J = (Σxi)² / (n × Σxi²)
    xi = CPU time allocated to process i
    Returns float [0, 1]. 1.0 = perfect fairness.
    """

def detect_starvation(process_metrics: list[dict], avg_burst: float) -> list[dict]:
    """
    Flags processes where waiting_time > STARVATION_THRESHOLD × avg_burst.
    Adds starved: bool to each process_metric entry.
    """
```

**MetricsResult Schema:**
```python
{
    "iris":  { "avg_waiting": float, "avg_turnaround": float, "cpu_util": float, "fairness": float, "starved_count": int },
    "rr":    { "avg_waiting": float, "avg_turnaround": float, "cpu_util": float, "fairness": float, "starved_count": int },
    "sjf":   { "avg_waiting": float, "avg_turnaround": float, "cpu_util": float, "fairness": float, "starved_count": int },
    "winner": { "avg_waiting": str, "avg_turnaround": str, "cpu_util": str, "fairness": str }
}
```

---

## 5. Error Handling Strategy

| Failure | Behavior | UI Response |
|---------|----------|-------------|
| Gemini rate limit | Activate Groq fallback | Badge: "Using Groq" |
| Groq failure | Activate heuristic classifier | Badge: "Pure Fuzzy Mode" |
| psutil permission error | Skip process, continue | Warning in process table |
| psutil returns 0 processes | Return 400 error | UI prompts switch to simulated |
| Fuzzy sim error per process | Assign score=5.0 neutral | Row highlighted yellow |
| Gemini summary failure | Return empty string | Summary panel hidden |
| Invalid preset name | Return 422 error | UI shows preset not found |

---

## 6. Known Limitations — v1.0

- scikit-fuzzy incompatible with numpy 2.x — must pin to 1.26.x
- psutil cpu_percent returns 0.0 on first call per process — add 0.1s interval
- Fuzzy engine is non-preemptive — does not model context switching overhead
- Gemini research summary adds 2–3 seconds — run asynchronously
- No persistence — all results lost on page refresh
- Rule base is hand-crafted — ANFIS-learned rules would be more rigorous in v2
