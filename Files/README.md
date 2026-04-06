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

## Folder Structure

```
iris/
├── backend/
│   ├── main.py
│   ├── fuzzy_engine.py
│   ├── gemini_engine.py
│   ├── simulator.py
│   ├── data_layer.py
│   ├── metrics.py
│   └── config.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   └── api/
│   └── package.json
├── .env
├── requirements.txt
└── README.md
```

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

## Documentation Index

| File | Purpose |
|------|---------|
| PRD.md | Product requirements and goals |
| architecture.md | System architecture and component breakdown |
| MVP Tech Doc.md | Module APIs, function signatures, data contracts |
| system Design.md | Fuzzy theory, design decisions, trade-off analysis |
| 06-api-contracts.md | FastAPI endpoint specifications |
| 07-monorepo-structure.md | Complete folder and file structure |
| 12-testing-strategy.md | Test cases for fuzzy engine, API, and fallback chain |

---

## Research Contribution

IRIS demonstrates that Mamdani fuzzy inference, when operating on normalized OS-level process attributes, produces scheduling decisions that are competitive with classical algorithms while providing three capabilities classical schedulers fundamentally cannot offer:

1. **Graceful handling of uncertainty** — approximate burst times don't break the system
2. **Explainability** — every decision traces back to a human-readable fuzzy rule
3. **Starvation prevention** — fuzzy aging is native to the inference logic, not bolted on

---

*Built as part of Innovative IT submission — BTech CSE, SRMU, 2026*
