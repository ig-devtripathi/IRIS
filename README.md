---
title: IRIS Intelligent Resource Inference Scheduler
emoji: 🧠
colorFrom: indigo
colorTo: blue
sdk: docker
pinned: false
---

# IRIS — Intelligent Resource Inference Scheduler

> *"Classical schedulers know the rules. IRIS understands the context."*

---

## What is IRIS?

IRIS is a research-grade CPU process scheduling system that replaces the crisp, deterministic logic of classical algorithms (Round Robin, SJF) with a **Mamdani fuzzy inference engine** — optionally enriched by a large language model for semantic workload classification.

The core thesis: CPU scheduling is a fundamentally fuzzy problem. Burst times are estimates. Priorities exist on a continuum. Waiting time urgency builds gradually. No binary rule captures this reality accurately. Fuzzy logic does.

IRIS is not a production OS scheduler. It is a demonstrable proof-of-concept that fuzzy reasoning produces scheduling decisions competitive with or superior to classical algorithms — with the added advantage of full explainability.

---

## Key Capabilities

- **Pure Fuzzy Mode** — Mamdani inference engine runs standalone, no AI dependency
- **AI Enhanced Mode** — Gemini 2.0 Flash classifies process workload behavior, enriching fuzzy inputs
- **Live Process Mode** — Reads real PIDs from host OS via psutil
- **Simulated Mode** — Generates synthetic process queues with realistic distributions
- **3-Algorithm Benchmark** — IRIS vs Round Robin vs SJF on identical queues
- **Starvation Detection** — Identifies and visualizes starvation risk in classical schedulers
- **Jain's Fairness Index** — Academic-grade fairness metric alongside standard metrics
- **Research Summary** — Auto-generated natural language analysis of each simulation run
- **Full Fallback Chain** — Gemini → Groq → Rule-based → Default. Never crashes.

---

## Architecture at a Glance

```
React Frontend (Stitch + Tailwind + Recharts)
            ↕ REST API
FastAPI Backend
    ├── data_layer.py       # psutil + synthetic generator
    ├── gemini_engine.py    # Gemini 2.0 Flash + Groq fallback
    ├── fuzzy_engine.py     # Mamdani FIS core
    ├── simulator.py        # IRIS + RR + SJF
    └── metrics.py          # Fairness index + performance metrics
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Tailwind CSS, Recharts |
| UI Generation | Stitch by Google Labs |
| Backend | FastAPI, Python 3.10+ |
| Fuzzy Engine | scikit-fuzzy (Mamdani inference) |
| AI Primary | Gemini 2.0 Flash |
| AI Fallback | Groq — Llama 3.3 70B |
| Process Data | psutil (live), numpy (simulated) |

---

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend
cd frontend
npm install
npm run dev
```

---

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
```

---

---

## Version Evolution

IRIS has evolved through several research phases, each increasing in complexity and robustness:

### **v1.0.0 — The Fuzzy Foundation**
- Implementation of the core Mamdani Fuzzy Inference System (FIS).
- Basic 11-rule base focused on Priority and Burst Time.
- Preemptive scheduling logic with fixed time-quantum.
- Jain's Fairness Index integration.

### **v2.0.0 — AI Semantic Awareness**
- Introduction of the **AI Enhanced Mode**.
- Integration of **Gemini 2.0 Flash** for semantic workload classification.
- Real-time conversion of string-based workload types into numeric behavior scores.
- High-fidelity Gantt visualization with persistent PID coloring.

### **v2.1.0 — Stable Inference (Current)**
- **Composite AI Pipeline**: Implemented a robust fallback chain (Groq Llama 3.3 → Gemini → Heuristic).
- **Starvation-Free Logic**: Transitioned to an optimized non-preemptive model with **dynamic aging rules** ($R14$, $R15$) that guarantee zero starvation.
- **Enhanced UX**: Reduced typewriter latency (8ms) and optimized UI for "Stable Run" visualization.
- **Production Polish**: Alignment of all labels to reflect the "Groq/Gemini" priority stack.

---

## Technical Appendix: AI Fallback Chain

To ensure 100% uptime, IRIS v2.1.0 uses a tiered intelligence strategy:
1. **Tier 1 (Groq)**: Ultra-low latency classification using Llama 3.3 70B.
2. **Tier 2 (Gemini)**: High-reasoning fallback if Groq API rate limits are hit.
3. **Tier 3 (Heuristic)**: Rule-based keyword matching if all cloud APIs are unreachable.
4. **Tier 4 (Safe Default)**: Default "Neutral" score to ensure the simulation never crashes.



