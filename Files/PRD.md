# Product Requirements Document
## IRIS — Intelligent Resource Inference Scheduler
**Version:** 2.0 | **Author:** Devraj Tripathi | **Date:** April 2026

---

## 1. Problem Statement

Modern operating system schedulers — Round Robin, Shortest Job First, Priority Scheduling — are built on deterministic, crisp logic conceived in an era of homogeneous, predictable workloads. Contemporary computing environments are fundamentally different: process burst times are approximations, I/O contention introduces stochastic latency, and priority is rarely a clean integer — it is a gradient.

Classical schedulers fail at three specific points:

**Starvation** — Low-priority processes can wait indefinitely in SJF. No classical algorithm natively prevents this without explicit aging bolted on as an afterthought.

**Brittleness** — A process with burst time 20ms is treated identically to one with 19ms in SJF, despite the negligible difference. Crisp rules create artificial cliffs in scheduling behavior.

**Opacity** — No classical scheduler can explain its decisions in human-readable terms. "Process A ran before Process B because its burst time was shorter" is not an explanation — it is a tautology.

IRIS addresses all three failures through Mamdani fuzzy inference: a scheduling paradigm that models uncertainty natively, reasons linguistically, and exposes its decision logic completely.

---

## 2. Product Vision

IRIS is a research prototype demonstrating fuzzy inference as a viable, explainable, and starvation-resistant alternative to classical CPU scheduling algorithms. It operates on real OS process data or synthetic workloads, applies AI-enriched fuzzy reasoning to produce scheduling decisions, benchmarks those decisions against RR and SJF, and presents findings through a professional React dashboard with full explainability tooling.

---

## 3. Goals

- Implement a Mamdani fuzzy inference engine as the core scheduling decision-maker
- Support pure fuzzy mode (no AI) and AI-enhanced mode (Gemini 2.0 Flash) via toggle
- Ingest real process data via psutil OR generate synthetic queues via toggle
- Provide preset workload scenarios for repeatable, real-world-relevant demos
- Benchmark IRIS against Round Robin and SJF on identical process queues
- Detect and visualize starvation risk in classical schedulers
- Compute Jain's Fairness Index alongside standard scheduling metrics
- Generate a natural language research summary after each simulation run
- Maintain 100% uptime via 4-layer fallback chain

---

## 4. Non-Goals

- No kernel-level scheduling override or OS patching
- No production deployment or containerization
- No multi-core parallel scheduling simulation (v1.0)
- No user authentication or persistent database
- No pre-trained ML model or labeled dataset required

---

## 5. User Personas

**Faculty Evaluator**
Assesses technical depth, theoretical correctness, and real-world relevance. Responds to Gantt charts, academic metrics (Jain's index), rule explainability, and direct comparison against known algorithms.

**Developer / Researcher**
Inspects module structure, API contracts, fuzzy rule base, and membership function definitions. Values clean separation of concerns, documented data contracts, and extensible architecture.

**Demo Audience**
Needs the UI to self-narrate — labels, tooltips, badges, and the auto-generated research summary explain the system without requiring intervention.

---

## 6. Functional Requirements

### 6.1 Core Features — Must Have

| ID | Feature | Description |
|----|---------|-------------|
| F01 | AI Toggle | Switch between Pure Fuzzy Mode and AI Enhanced Mode |
| F02 | Data Source Toggle | Switch between Live (psutil) and Simulated (generator) |
| F03 | Live Process Ingestion | Read real PIDs from host OS via psutil |
| F04 | Synthetic Process Generator | Generate N configurable fake processes (5–30) |
| F05 | Preset Workload Scenarios | Heavy CPU / Mixed Load / IO Intensive presets |
| F06 | Gemini 2.0 Flash Integration | Classify process workload type and behavior score |
| F07 | Groq Fallback | Llama 3.3 70B fallback when Gemini limit hits |
| F08 | Pure Fuzzy Fallback | Rule-based heuristic classifier when all APIs fail |
| F09 | Mamdani Fuzzy Engine | 4 inputs (3 in pure mode), 12 rules, centroid defuzz |
| F10 | Round Robin Simulator | Preemptive RR with configurable time quantum |
| F11 | SJF Simulator | Non-preemptive Shortest Job First |
| F12 | Gantt Chart — All 3 | Side-by-side Gantt charts for all three algorithms |
| F13 | Starvation Detection | Highlight starvation risk in RR/SJF, rescue in IRIS |
| F14 | Performance Metrics Table | Avg wait, turnaround, CPU utilization, Jain's Index |
| F15 | Jain's Fairness Index | Academic fairness metric for all 3 algorithms |
| F16 | Rule Firing Explainer | Top 3 fired rules per process with activation values |
| F17 | MF Visualizer | Membership function plots for all variables |
| F18 | Research Summary | Auto-generated Gemini analysis post simulation |

### 6.2 Extended Features — Good to Have

| ID | Feature | Description |
|----|---------|-------------|
| E01 | Process count slider | Control N for simulated mode (5–30) |
| E02 | Time quantum control | Adjustable RR quantum (default 4ms) |
| E03 | Mode status badge | Visual indicator of current operating mode |
| E04 | CSV export | Download metrics comparison as CSV |

---

## 7. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Full pipeline execution AI mode | < 5 seconds |
| Full pipeline execution pure fuzzy | < 1 second |
| Gemini API rate limit handling | Graceful fallback zero crash |
| Minimum processes | 5 |
| Maximum processes v1 | 30 |
| Python version | 3.10+ |
| Node version | 18+ |
| Platform | Windows / macOS / Linux |

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| IRIS avg waiting time vs RR | ≤ RR in ≥ 60% of simulation runs |
| IRIS Jain's Fairness Index vs SJF | ≥ SJF in ≥ 70% of runs |
| Fuzzy rule base size | Exactly 12 well-formed rules |
| Starvation detection accuracy | 100% of starved processes flagged |
| System uptime during demo | 100% no crashes under any toggle state |

---

## 9. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Tailwind CSS + Recharts |
| UI Generation | Stitch by Google Labs |
| Backend | FastAPI + Python 3.10+ |
| Fuzzy Engine | scikit-fuzzy |
| AI Primary | Gemini 2.0 Flash |
| AI Fallback | Groq — Llama 3.3 70B |
| Process Data | psutil |
| Environment | python-dotenv |

---

## 10. Operating Modes

| Mode | AI Toggle | Data Toggle | Behavior Score Used |
|------|-----------|-------------|---------------------|
| Pure Fuzzy + Live | OFF | Live | No — 3 fuzzy inputs |
| Pure Fuzzy + Simulated | OFF | Simulated | No — 3 fuzzy inputs |
| AI Enhanced + Live | ON | Live | Yes — 4 fuzzy inputs |
| AI Enhanced + Simulated | ON | Simulated | Yes — 4 fuzzy inputs |

---

## 11. Fallback Chain

```
Primary:    Gemini 2.0 Flash        [AI Enhanced Mode]
Fallback 1: Groq Llama 3.3 70B     [AI Enhanced Mode]
Fallback 2: Rule-based Heuristic   [Pure Fuzzy Mode]
Fallback 3: Default values          [Emergency only]
```

---

## 12. Constraints

- All API keys in .env — never hardcoded
- No external database — session state only
- scikit-fuzzy requires numpy < 2.0 — pin to 1.26.x
- psutil requires standard user permissions — no root needed
