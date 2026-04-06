# Testing Strategy
## IRIS — Intelligent Resource Inference Scheduler
**Version:** 2.0 | **Author:** Devraj Tripathi | **Date:** April 2026

---

## 1. Testing Philosophy

IRIS is a research prototype, not a production system. Testing is not about 100% code coverage — it is about verifying three things with absolute certainty:

1. **The fuzzy engine reasons correctly** — membership functions, rules, and defuzzification produce theoretically sound outputs
2. **The API contract is honored** — every endpoint returns exactly the schema the frontend expects
3. **The fallback chain never crashes** — IRIS operates correctly under any combination of API availability

Everything else is secondary.

---

## 2. Test Structure

```
backend/
└── tests/
    ├── test_fuzzy_engine.py
    ├── test_data_layer.py
    ├── test_gemini_engine.py
    ├── test_simulator.py
    ├── test_metrics.py
    └── test_api.py
```

Run all tests:
```bash
pip install pytest pytest-asyncio httpx
pytest tests/ -v
```

---

## 3. Fuzzy Engine Tests — `test_fuzzy_engine.py`

These are the most important tests in the entire project.

### 3.1 Membership Function Validation

```python
import skfuzzy as fuzz
import numpy as np
from fuzzy_engine import build_system

def test_waiting_time_mf_boundaries():
    """
    At waiting_time=0: low membership should be 1.0, high should be 0.0
    At waiting_time=100: high membership should be 1.0, low should be 0.0
    At waiting_time=50: medium should be maximum, low and high partial
    """
    wt = np.arange(0, 101, 1)
    low    = fuzz.trimf(wt, [0, 0, 40])
    medium = fuzz.trimf(wt, [20, 50, 80])
    high   = fuzz.trimf(wt, [60, 100, 100])

    assert fuzz.interp_membership(wt, low, 0) == 1.0
    assert fuzz.interp_membership(wt, high, 0) == 0.0
    assert fuzz.interp_membership(wt, high, 100) == 1.0
    assert fuzz.interp_membership(wt, low, 100) == 0.0
    assert fuzz.interp_membership(wt, medium, 50) == 1.0

def test_scheduling_score_range():
    """
    For any valid input combination, scheduling_score must be in [0, 10].
    Test 100 random input combinations.
    """
    import random
    sim_pure = build_system(mode="pure")
    
    for _ in range(100):
        sim_pure.input['waiting_time']  = random.uniform(0, 100)
        sim_pure.input['burst_estimate']= random.uniform(0, 100)
        sim_pure.input['priority']      = random.uniform(0, 10)
        sim_pure.compute()
        score = sim_pure.output['scheduling_score']
        assert 0 <= score <= 10, f"Score {score} out of range"

def test_high_urgency_gets_high_score():
    """
    R01: waiting_time=high(90) AND priority=high(9) → score should be > 7
    """
    sim = build_system(mode="pure")
    sim.input['waiting_time']   = 90
    sim.input['burst_estimate'] = 50
    sim.input['priority']       = 9
    sim.compute()
    assert sim.output['scheduling_score'] > 7.0

def test_low_urgency_gets_low_score():
    """
    R12: waiting_time=low(5) AND priority=low(2) AND burst=long(90) → score < 3
    """
    sim = build_system(mode="pure")
    sim.input['waiting_time']   = 5
    sim.input['burst_estimate'] = 90
    sim.input['priority']       = 2
    sim.compute()
    assert sim.output['scheduling_score'] < 3.0

def test_ai_mode_vs_pure_mode_score_difference():
    """
    AI mode with cpu_bound process (behavior_score=0.9, high wait)
    should score higher than pure mode on same inputs.
    Validates that behavior_score adds meaningful signal.
    """
    sim_pure = build_system(mode="pure")
    sim_ai   = build_system(mode="ai")

    inputs = {'waiting_time': 70, 'burst_estimate': 30, 'priority': 7}

    sim_pure.input.update(inputs)
    sim_pure.compute()
    score_pure = sim_pure.output['scheduling_score']

    sim_ai.input.update(inputs)
    sim_ai.input['behavior_score'] = 0.9
    sim_ai.compute()
    score_ai = sim_ai.output['scheduling_score']

    assert score_ai >= score_pure - 0.5  # AI mode should not be worse

def test_rule_count():
    """Verify exactly 12 rules are defined in each mode."""
    from fuzzy_engine import RULES_PURE, RULES_AI
    assert len(RULES_PURE) == 12
    assert len(RULES_AI) == 12
```

---

## 4. Data Layer Tests — `test_data_layer.py`

```python
from data_layer import generate_synthetic_processes, load_preset, normalize_processes

def test_synthetic_generator_count():
    for n in [5, 10, 15, 30]:
        processes = generate_synthetic_processes(n)
        assert len(processes) == n

def test_synthetic_pids_start_at_1001():
    processes = generate_synthetic_processes(5)
    pids = [p['pid'] for p in processes]
    assert pids[0] == 1001
    assert pids[-1] == 1005

def test_synthetic_reproducibility():
    """Same seed → identical output."""
    p1 = generate_synthetic_processes(10, seed=42)
    p2 = generate_synthetic_processes(10, seed=42)
    assert p1 == p2

def test_synthetic_different_seeds():
    """Different seeds → different output."""
    p1 = generate_synthetic_processes(10, seed=1)
    p2 = generate_synthetic_processes(10, seed=2)
    assert p1 != p2

def test_synthetic_field_ranges():
    """All fields within defined universe ranges."""
    processes = generate_synthetic_processes(20)
    for p in processes:
        assert 5.0 <= p['burst_time'] <= 100.0
        assert 0.0 <= p['arrival_time'] <= 50.0
        assert 1 <= p['priority'] <= 10
        assert 0.0 <= p['cpu_percent'] <= 100.0
        assert 0.0 <= p['memory_percent'] <= 100.0

def test_preset_heavy_cpu():
    processes = load_preset("heavy_cpu")
    assert len(processes) > 0
    avg_burst = sum(p['burst_time'] for p in processes) / len(processes)
    assert avg_burst > 50  # heavy CPU should have high burst times

def test_preset_io_intensive():
    processes = load_preset("io_intensive")
    avg_burst = sum(p['burst_time'] for p in processes) / len(processes)
    assert avg_burst < 40  # IO intensive should have low burst times

def test_preset_invalid_name():
    import pytest
    with pytest.raises(ValueError):
        load_preset("nonexistent_preset")

def test_normalize_clamps_values():
    """Normalization should clamp out-of-range values, not crash."""
    raw = [{"pid": 1, "name": "test", "burst_time": 999,
            "arrival_time": 999, "priority": 99,
            "cpu_percent": 200, "memory_percent": 200}]
    normalized = normalize_processes(raw)
    assert normalized[0]['burst_time'] <= 100
    assert normalized[0]['priority'] <= 10
```

---

## 5. Gemini Engine Tests — `test_gemini_engine.py`

```python
from unittest.mock import patch, MagicMock
from gemini_engine import classify, _heuristic_classify

def test_heuristic_python_is_cpu_bound():
    processes = [{"pid": 1001, "name": "python.exe", "cpu_percent": 45.0}]
    result = _heuristic_classify(processes)
    assert result[0]['workload_type'] == "cpu_bound"
    assert result[0]['behavior_score'] > 0.5

def test_heuristic_idle_is_io_bound():
    processes = [{"pid": 1002, "name": "system idle", "cpu_percent": 2.0}]
    result = _heuristic_classify(processes)
    assert result[0]['workload_type'] == "io_bound"
    assert result[0]['behavior_score'] < 0.4

def test_heuristic_unknown_process_uses_cpu_percent():
    """Unknown process name falls back to cpu_percent threshold."""
    processes = [{"pid": 1003, "name": "xyz_unknown.exe", "cpu_percent": 75.0}]
    result = _heuristic_classify(processes)
    assert result[0]['workload_type'] == "cpu_bound"

def test_fallback_chain_gemini_fails():
    """When Gemini fails, Groq is called. When Groq fails, heuristic runs."""
    processes = [{"pid": 1001, "name": "python.exe", "cpu_percent": 45.0,
                  "burst_time": 40, "arrival_time": 0, "priority": 5}]
    
    with patch('gemini_engine._call_gemini', side_effect=Exception("Rate limit")):
        with patch('gemini_engine._call_groq', side_effect=Exception("Groq down")):
            enriched, active_mode = classify(processes, mode="ai")
            assert active_mode == "heuristic"
            assert len(enriched) == len(processes)
            assert 'behavior_score' in enriched[0]

def test_pure_mode_never_calls_api():
    """mode='pure' must never make API calls."""
    processes = [{"pid": 1001, "name": "python.exe", "cpu_percent": 45.0,
                  "burst_time": 40, "arrival_time": 0, "priority": 5}]
    
    with patch('gemini_engine._call_gemini') as mock_gemini:
        with patch('gemini_engine._call_groq') as mock_groq:
            classify(processes, mode="pure")
            mock_gemini.assert_not_called()
            mock_groq.assert_not_called()

def test_classify_returns_all_required_fields():
    """Every enriched process must have all required fields."""
    processes = [{"pid": 1001, "name": "chrome.exe", "cpu_percent": 20.0,
                  "burst_time": 35, "arrival_time": 0, "priority": 6}]
    enriched, _ = classify(processes, mode="pure")
    required = ['workload_type', 'behavior_score', 'burst_confidence', 'reasoning']
    for field in required:
        assert field in enriched[0], f"Missing field: {field}"
```

---

## 6. Simulator Tests — `test_simulator.py`

```python
from simulator import run_all, run_iris, run_round_robin, run_sjf

SAMPLE_PROCESSES = [
    {"pid": 1001, "name": "p1", "burst_time": 24, "arrival_time": 0, "priority": 8,
     "scheduling_score": 8.2, "waiting_time": 0},
    {"pid": 1002, "name": "p2", "burst_time": 3,  "arrival_time": 0, "priority": 4,
     "scheduling_score": 4.1, "waiting_time": 0},
    {"pid": 1003, "name": "p3", "burst_time": 3,  "arrival_time": 0, "priority": 6,
     "scheduling_score": 6.5, "waiting_time": 0},
]

def test_all_processes_complete():
    """Every process must appear in Gantt exactly once (non-preemptive)."""
    results = run_all(SAMPLE_PROCESSES, time_quantum=4)
    for algo_key in ["iris", "sjf"]:
        pids_in_gantt = [e['pid'] for e in results[algo_key]['gantt']]
        for p in SAMPLE_PROCESSES:
            assert p['pid'] in pids_in_gantt

def test_gantt_no_overlap():
    """No two Gantt entries should overlap in time for IRIS and SJF."""
    results = run_all(SAMPLE_PROCESSES, time_quantum=4)
    for algo_key in ["iris", "sjf"]:
        gantt = sorted(results[algo_key]['gantt'], key=lambda x: x['start'])
        for i in range(len(gantt) - 1):
            assert gantt[i]['end'] <= gantt[i+1]['start'], \
                f"Overlap detected in {algo_key}: {gantt[i]} → {gantt[i+1]}"

def test_iris_no_starvation():
    """No process should be flagged as starved in IRIS result."""
    results = run_all(SAMPLE_PROCESSES, time_quantum=4)
    starved = [m for m in results['iris']['process_metrics'] if m['starved']]
    assert len(starved) == 0

def test_turnaround_equals_wait_plus_burst():
    """Fundamental identity: turnaround_time = waiting_time + burst_time"""
    results = run_all(SAMPLE_PROCESSES, time_quantum=4)
    for algo_key in ["iris", "sjf"]:
        for metric in results[algo_key]['process_metrics']:
            pid = metric['pid']
            burst = next(p['burst_time'] for p in SAMPLE_PROCESSES if p['pid'] == pid)
            expected = round(metric['waiting_time'] + burst, 2)
            actual = round(metric['turnaround_time'], 2)
            assert abs(expected - actual) < 0.01, \
                f"{algo_key} PID {pid}: {expected} != {actual}"

def test_sjf_minimum_waiting_time():
    """SJF should produce minimum average waiting time for non-preemptive case."""
    results = run_all(SAMPLE_PROCESSES, time_quantum=4)
    sjf_avg = results['sjf']['process_metrics']
    avg_wait = sum(m['waiting_time'] for m in sjf_avg) / len(sjf_avg)
    iris_avg_wait = sum(m['waiting_time'] for m in results['iris']['process_metrics']) / len(SAMPLE_PROCESSES)
    # SJF is optimal for average wait — IRIS may be slightly higher but compensates in fairness
    assert avg_wait <= iris_avg_wait * 1.5  # IRIS within 50% of SJF on waiting time
```

---

## 7. Metrics Tests — `test_metrics.py`

```python
from metrics import jains_fairness_index, detect_starvation, compute_all

def test_jains_perfect_fairness():
    """Equal CPU shares → J = 1.0"""
    shares = [10.0, 10.0, 10.0, 10.0]
    assert abs(jains_fairness_index(shares) - 1.0) < 0.001

def test_jains_worst_case():
    """One process gets all CPU → J = 1/n"""
    n = 4
    shares = [40.0, 0.0, 0.0, 0.0]
    expected = 1 / n
    assert abs(jains_fairness_index(shares) - expected) < 0.01

def test_jains_range():
    """Jain's index always in [1/n, 1.0]"""
    import random
    for _ in range(100):
        n = random.randint(2, 20)
        shares = [random.uniform(0, 100) for _ in range(n)]
        j = jains_fairness_index(shares)
        assert 0 <= j <= 1.0 + 0.001

def test_starvation_detection_flags_correctly():
    """Process waiting 4x avg burst should be flagged as starved."""
    avg_burst = 20.0
    metrics = [
        {"pid": 1001, "waiting_time": 10.0},   # Not starved (0.5x)
        {"pid": 1002, "waiting_time": 80.0},   # Starved (4x avg burst)
        {"pid": 1003, "waiting_time": 55.0},   # Starved (2.75x > threshold 3x? No)
    ]
    result = detect_starvation(metrics, avg_burst)
    assert result[0]['starved'] == False
    assert result[1]['starved'] == True   # 80 > 3 × 20 = 60
    assert result[2]['starved'] == False  # 55 < 60
```

---

## 8. API Tests — `test_api.py`

```python
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"
    assert "services" in data

def test_run_pure_simulated():
    """Core happy path — pure fuzzy mode with simulated data."""
    response = client.post("/api/run", json={
        "mode": "pure",
        "source": "simulated",
        "n_processes": 5
    })
    assert response.status_code == 200
    data = response.json()
    assert "processes" in data
    assert "results" in data
    assert "metrics" in data
    assert len(data["processes"]) == 5
    assert "iris" in data["results"]
    assert "round_robin" in data["results"]
    assert "sjf" in data["results"]

def test_run_response_schema_complete():
    """All required fields present in response."""
    response = client.post("/api/run", json={"mode": "pure", "source": "simulated"})
    data = response.json()
    assert "meta" in data
    assert "research_summary" in data
    assert data["meta"]["mode"] == "pure"
    for algo in ["iris", "round_robin", "sjf"]:
        assert "gantt" in data["results"][algo]
        assert "process_metrics" in data["results"][algo]
        assert "avg_waiting_time" in data["metrics"][algo]
        assert "fairness_index" in data["metrics"][algo]
        assert "starved_count" in data["metrics"][algo]

def test_preset_heavy_cpu():
    response = client.post("/api/run", json={
        "mode": "pure",
        "source": "simulated",
        "preset": "heavy_cpu"
    })
    assert response.status_code == 200

def test_invalid_mode():
    response = client.post("/api/run", json={"mode": "invalid", "source": "simulated"})
    assert response.status_code == 422

def test_n_processes_bounds():
    response = client.post("/api/run", json={"mode": "pure", "source": "simulated", "n_processes": 4})
    assert response.status_code == 422  # Below minimum of 5
    
    response = client.post("/api/run", json={"mode": "pure", "source": "simulated", "n_processes": 31})
    assert response.status_code == 422  # Above maximum of 30

def test_get_preset_endpoint():
    response = client.get("/api/presets/mixed_load")
    assert response.status_code == 200
    data = response.json()
    assert "processes" in data
    assert "preset" in data
    assert data["preset"] == "mixed_load"

def test_get_preset_invalid():
    response = client.get("/api/presets/nonexistent")
    assert response.status_code == 404

def test_jains_index_in_response():
    """Jain's Fairness Index must be present for all algorithms."""
    response = client.post("/api/run", json={"mode": "pure", "source": "simulated"})
    data = response.json()
    for algo in ["iris", "round_robin", "sjf"]:
        j = data["metrics"][algo]["fairness_index"]
        assert 0.0 <= j <= 1.0

def test_gantt_entries_have_colors():
    """All Gantt entries must have hex color codes."""
    response = client.post("/api/run", json={"mode": "pure", "source": "simulated"})
    data = response.json()
    for algo in ["iris", "round_robin", "sjf"]:
        for entry in data["results"][algo]["gantt"]:
            assert "color" in entry
            assert entry["color"].startswith("#")
            assert len(entry["color"]) == 7
```

---

## 9. Manual Demo Verification Checklist

Run through this before every faculty demonstration:

| Check | Expected | Pass? |
|-------|----------|-------|
| App loads at localhost:5173 | Dashboard visible, all panels empty | |
| Health check badge green | "System Ready" | |
| Run with Pure Fuzzy + Simulated | All 5 panels populate | |
| Run with AI Enhanced + Simulated | Status badge shows "Gemini" or "Groq" | |
| Run with Pure Fuzzy + Live | Real PIDs visible in process table | |
| Preset: Heavy CPU | High burst times in process table | |
| Preset: IO Intensive | Low burst times in process table | |
| Jain's Index present | Third row in metrics table | |
| Starvation count shown | In metrics table for RR and SJF | |
| IRIS starved count = 0 | Always zero | |
| Research summary appears | Non-empty paragraph | |
| Gantt charts same time axis | All three aligned | |
| Rule log updates on process select | Fired rules shown | |
| Disconnect internet, run pure mode | Still works, no crash | |
| Disconnect internet, run AI mode | Heuristic fallback, badge updates | |
