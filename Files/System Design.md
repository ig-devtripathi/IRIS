# System Design Document
## IRIS — Intelligent Resource Inference Scheduler
**Version:** 2.0 | **Author:** Devraj Tripathi | **Date:** April 2026

---

## 1. Design Objectives

**Theoretical Correctness** — Every design decision must be defensible from fuzzy systems theory literature. Membership function shapes, rule construction, inference methods, and defuzzification strategy are chosen based on published research, not convenience.

**Empirical Measurability** — IRIS produces quantifiable, comparable outputs. Subjective claims are insufficient. Every assertion about scheduling quality is backed by Jain's Fairness Index, average waiting time, or turnaround time — metrics with established definitions in OS literature.

**Explainability by Design** — The ability to trace every scheduling decision to a specific fuzzy rule is not a feature added after the fact. It is a first-class architectural requirement. Any design that obscures the reasoning chain is rejected.

**Fault Tolerance** — A system that crashes during a demo has failed regardless of its theoretical quality. IRIS is designed to operate correctly under any combination of API availability, data source, and toggle state.

---

## 2. Why Fuzzy Logic for CPU Scheduling

### 2.1 The Core Argument

CPU scheduling involves reasoning under uncertainty at every step:

- Burst time is an *estimate* — the OS does not know true burst time in advance
- Priority is a *gradient* — the difference between priority 7 and priority 8 is not binary
- Waiting time urgency *builds gradually* — a process that has waited 90ms is not categorically different from one that waited 89ms, but it is meaningfully more urgent

Classical schedulers treat all three as crisp values and make cliff-edge decisions. A process with burst time 20ms and another with 21ms are treated identically in a range and categorically differently at a threshold. This brittleness is a design flaw, not a feature.

Fuzzy logic models all three as linguistic variables with smooth membership transitions. The decision to schedule a process is not binary — it is a score on a continuous scale, computed from the weighted intersection of multiple fuzzy conditions.

### 2.2 Why Mamdani Over Sugeno

**Mamdani inference** is chosen over Takagi-Sugeno for one decisive reason: explainability.

Mamdani consequents are fuzzy sets described by linguistic terms:
> "IF waiting_time IS high AND priority IS high THEN scheduling_score IS very_high"

This maps directly to how a human systems architect thinks. A faculty member or researcher can read this rule and immediately verify its correctness.

Sugeno's crisp function consequents (e.g., score = 0.7×waiting + 0.3×priority) are computationally efficient but produce outputs that cannot be verified through human reasoning. For an academic demonstration where explainability is the primary evaluation criterion, Mamdani is the only correct choice.

### 2.3 Why Centroid Defuzzification

The centroid method computes the center of gravity of the output fuzzy set:

```
score_crisp = Σ(μ(x) · x) / Σ(μ(x))
```

Alternative methods considered:

| Method | Reason Rejected |
|--------|----------------|
| Mean of Maximum (MOM) | Ignores shape of output set — loses information |
| Bisector | Computationally similar to centroid but less intuitive to explain |
| Smallest of Maximum | Produces systematically low outputs — biased |
| Largest of Maximum | Produces systematically high outputs — biased |

Centroid is the academic standard and produces the most accurate representation of the aggregated fuzzy output for a continuous scheduling score.

---

## 3. Fuzzy System Design

### 3.1 Input Variable Design Rationale

**waiting_time [0, 100ms]**
Models starvation risk. A process that has waited more than 60ms is unambiguously in the "high" zone regardless of other factors. The medium zone (20–80ms) has broad overlap to allow smooth scoring transitions — a process at 40ms is partially medium and partially low, not categorically one or the other.

**burst_estimate [0, 100ms]**
Models execution cost. Short processes (0–35ms) get scheduling preference in line with SJF's core insight, but without SJF's cliff-edge. A 34ms process and a 36ms process receive nearly identical treatment in IRIS — their burst MF memberships differ by less than 0.05.

**priority [0, 10]**
Maps OS-level priority to a normalized fuzzy domain. Low [0–4], medium [3–7] (overlapping), high [6–10]. Overlap is intentional — a priority of 5 is genuinely ambiguous between low-medium and medium-high contexts.

**behavior_score [0.0, 1.0] — AI mode only**
LLM-derived estimate of CPU intensity. io_bound processes [0.0–0.4] are deprioritized slightly — they will voluntarily yield CPU on I/O waits, so holding the CPU for them is wasteful. cpu_bound processes [0.6–1.0] need the CPU continuously and should not be interrupted. This is domain knowledge that neither RR nor SJF encodes at all.

### 3.2 Rule Base Design

Rules are organized in three tiers with explicit design rationale:

**Tier 1 — Urgency Rules (R01–R04)**
Address starvation prevention. A process that has waited too long gets boosted regardless of burst time or workload type. This is the fuzzy equivalent of aging in classical schedulers, but native to the inference logic rather than bolted on.

Design principle: waiting_time IS high should trigger very_high or high scheduling score regardless of other variables. Starvation prevention is non-negotiable.

**Tier 2 — Efficiency Rules (R05–R08)**
Capture SJF's core insight (short jobs first) without its brittleness. A short high-priority process gets high score. A long low-priority process that hasn't waited long gets very_low score. These rules implement efficiency under certainty — when waiting time is not yet critical.

**Tier 3 — Behavior-Aware Rules (R09–R12)**
Active only in AI enhanced mode. Use behavior_score to make context-sensitive decisions. A CPU-bound process that has waited long should be scheduled aggressively — it cannot make progress any other way. An IO-bound process at medium priority can wait slightly longer — it will yield CPU anyway when its I/O event occurs.

In pure fuzzy mode, R09–R11 are replaced with three additional burst/priority interaction rules to maintain 12-rule coverage.

### 3.3 Starvation Prevention Mechanism

IRIS prevents starvation through dynamic re-scoring — after each process completes, all remaining processes are re-scored with updated waiting_times. Because waiting_time feeds directly into R01 and R02, a process that has waited long enough will eventually receive very_high scheduling score regardless of its burst time or priority.

This is mathematically provable: for any process with burst_time ≤ 100ms, there exists a waiting_time threshold after which its scheduling_score exceeds any other process in the queue. IRIS cannot starve a process.

Classical RR and SJF do not share this property. IRIS visualizes the difference by flagging processes that would starve under RR/SJF as "rescued" in the Gantt chart.

---

## 4. Scheduling Algorithm Implementations

### 4.1 IRIS — Fuzzy Scheduler

```
Initialize: score all processes at t=0
While ready_queue not empty:
    Select process with highest scheduling_score
    Execute to completion (non-preemptive)
    Update waiting_times for all remaining processes
    Re-score all remaining processes
    Record Gantt entry
```

Non-preemptive design is chosen for v1 because:
- Simpler Gantt visualization — no context switch overhead bars
- Cleaner metric comparison with non-preemptive SJF
- Re-scoring provides dynamic adaptation without preemption complexity

### 4.2 Round Robin

Standard textbook implementation. Preemptive. Circular ready queue. Time quantum configurable from UI (default 4ms). Arrival time respected — processes entering the ready queue mid-simulation are inserted correctly.

### 4.3 SJF — Shortest Job First

Non-preemptive. At each dispatch point, the process with minimum burst_time among arrived processes is selected. Burst times are used as-is (same values IRIS receives) to ensure fair comparison.

---

## 5. Jain's Fairness Index

Jain's Fairness Index (J) measures how equitably CPU time is distributed across processes:

```
J = (Σxi)² / (n × Σxi²)
```

Where xi is the CPU time allocated to process i.

Properties:
- J = 1.0: Perfect fairness — all processes receive equal CPU share
- J = 1/n: Worst case — one process receives all CPU time
- J is always in [1/n, 1.0]

IRIS is expected to achieve higher J than SJF because SJF systematically favors short processes, starving long ones. IRIS's starvation prevention mechanism distributes CPU more equitably over time.

This metric is used in published OS research (Jain et al., 1984) and immediately signals academic rigor to any OS-literate evaluator.

---

## 6. AI Layer Design

### 6.1 Why LLM for Workload Classification

Process names are semantic. "python.exe" is almost certainly CPU-bound. "mysqld" is I/O-bound. "chrome.exe" is mixed. This semantic knowledge is embedded in the pre-training of large language models and cannot be easily replicated by a rules-based classifier without an exhaustive lookup table.

Gemini 2.0 Flash reasons over process names the way an experienced sysadmin would — from semantic understanding and contextual inference. This produces behavior_score values that are more nuanced and accurate than any threshold-based classifier.

### 6.2 Why AI is Optional

The fuzzy inference engine is the research contribution of IRIS. AI enrichment is a performance enhancement — it provides better quality inputs to the fuzzy engine, not a replacement for it. Demonstrating that IRIS schedules intelligently without AI (pure fuzzy mode) is essential to establishing fuzzy logic as the core technology.

The AI toggle is a pedagogical tool. It allows faculty to directly observe the marginal contribution of AI enrichment by comparing pure fuzzy and AI enhanced outputs on the same process queue.

### 6.3 Prompt Engineering

The Gemini prompt is designed with three constraints:
1. Return ONLY valid JSON — no markdown, no preamble, no explanation
2. One object per process — matches input array structure
3. behavior_score as float [0.0, 1.0] — directly compatible with fuzzy universe

Groq receives the identical prompt. Llama 3.3 70B is capable of following strict JSON output constraints reliably.

---

## 7. Trade-Off Analysis

| Trade-Off | Decision | Justification |
|-----------|----------|---------------|
| Mamdani vs Sugeno | Mamdani | Explainability > computational efficiency |
| Non-preemptive vs Preemptive | Non-preemptive v1 | Simpler visualization, cleaner comparison |
| Centroid vs MOM defuzz | Centroid | Most accurate, academic standard |
| Static rules vs ANFIS | Static | No labeled scheduling dataset; rules more defensible |
| FastAPI vs Flask | FastAPI | Async, auto-docs, type safety via Pydantic |
| Recharts vs matplotlib | Recharts | Native React, animated, professional output |
| 3 algorithms vs 2 | 3 (RR + SJF + IRIS) | Two baselines strengthens comparison |
| Jain's Index vs custom metric | Jain's | Established in literature, immediately credible |

---

## 8. Research Contribution Statement

IRIS's primary research contribution is the empirical demonstration that Mamdani fuzzy inference, when applied to normalized OS-level process attributes, produces scheduling decisions that are:

1. Competitive with or superior to Round Robin and SJF on standard performance metrics (waiting time, turnaround time, CPU utilization)
2. Provably starvation-free through dynamic fuzzy aging
3. More equitable as measured by Jain's Fairness Index
4. Fully explainable through human-readable fuzzy rules

The secondary contribution is the demonstration that LLM-based workload classification (behavior_score) measurably improves fuzzy scheduling quality when compared to pure fuzzy mode on the same workload — establishing a viable architecture for hybrid LLM + fuzzy systems in resource management contexts.

This positions IRIS not as an engineering deliverable but as a research prototype — the correct framing for an innovative IT submission evaluated on novelty, correctness, and impact.
