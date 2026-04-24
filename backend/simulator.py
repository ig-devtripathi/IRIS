import copy
import config
import fuzzy_engine

GANTT_COLORS = [
    "#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6",
    "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#ec4899",
    "#84cc16", "#fb923c", "#a78bfa", "#34d399", "#fbbf24",
    "#60a5fa", "#e879f9", "#4ade80", "#f472b6", "#38bdf8",
]


def _assign_colors(processes: list[dict]) -> dict:
    """Creates a PID → hex color mapping. Same PID always gets same color."""
    color_map = {}
    for i, p in enumerate(processes):
        color_map[p['pid']] = GANTT_COLORS[i % len(GANTT_COLORS)]
    return color_map


def run_all(processes: list[dict],
            time_quantum: int = 4) -> dict:
    """Runs all three schedulers on identical process queues."""
    iris_procs = copy.deepcopy(processes)
    rr_procs = copy.deepcopy(processes)
    sjf_procs = copy.deepcopy(processes)

    # Initialize waiting_time=0.0 in all copies
    for p in iris_procs:
        p['waiting_time'] = 0.0
    for p in rr_procs:
        p['waiting_time'] = 0.0
    for p in sjf_procs:
        p['waiting_time'] = 0.0

    color_map = _assign_colors(processes)

    # Determine which FIS to use based on whether behavior_score exists
    has_behavior = any('behavior_score' in p for p in processes)
    if has_behavior:
        fis = fuzzy_engine.get_fis_ai()
        mode = "ai"
    else:
        fis = fuzzy_engine.get_fis_pure()
        mode = "pure"

    # Score IRIS processes
    iris_procs = fuzzy_engine.score_processes(iris_procs, fis, mode)

    iris_result = run_iris(iris_procs, color_map, fis, mode)
    rr_result = run_round_robin(rr_procs, time_quantum, color_map)
    sjf_result = run_sjf(sjf_procs, color_map)

    return {
        "iris": iris_result,
        "round_robin": rr_result,
        "sjf": sjf_result,
    }


def run_iris(processes: list[dict],
             color_map: dict,
             fis,
             mode: str = "pure") -> dict:
    """Non-preemptive fuzzy scheduler with dynamic re-scoring."""
    remaining = copy.deepcopy(processes)
    current_time = min(p['arrival_time'] for p in remaining) \
        if remaining else 0.0
    gantt = []
    process_metrics = []

    while remaining:
        # Find arrived processes
        arrived = [p for p in remaining
                   if p['arrival_time'] <= current_time]

        if not arrived:
            # Jump to next arrival
            current_time = min(p['arrival_time'] for p in remaining)
            continue

        # Select process with highest scheduling_score
        selected = max(arrived,
                       key=lambda x: x.get('scheduling_score', 0))

        start = current_time
        end = current_time + selected['burst_time']

        gantt.append({
            "pid": selected['pid'],
            "name": selected['name'],
            "start": float(round(start, 2)),
            "end": float(round(end, 2)),
            "color": color_map.get(selected['pid'], "#6366f1"),
        })

        waiting_time = start - selected['arrival_time']
        turnaround = end - selected['arrival_time']

        process_metrics.append({
            "pid": selected['pid'],
            "waiting_time": float(round(waiting_time, 2)),
            "turnaround_time": float(round(turnaround, 2)),
            "completion_time": float(round(end, 2)),
            "starved": False,  # placeholder — recomputed by metrics.detect_starvation()
        })

        current_time = end
        remaining.remove(selected)

        # Update waiting_time and re-score remaining
        if remaining:
            for r in remaining:
                r['waiting_time'] = max(0.0,
                                         current_time - r['arrival_time'])
            remaining = fuzzy_engine.score_processes(remaining, fis, mode)

    return {
        "algorithm": "IRIS",
        "gantt": gantt,
        "process_metrics": process_metrics,
    }


def run_round_robin(processes: list[dict],
                    quantum: int,
                    color_map: dict) -> dict:
    """Standard preemptive Round Robin implementation."""
    procs = copy.deepcopy(processes)
    n = len(procs)

    # Sort by arrival time
    procs.sort(key=lambda x: x['arrival_time'])

    remaining_burst = {p['pid']: p['burst_time'] for p in procs}
    arrival = {p['pid']: p['arrival_time'] for p in procs}
    completion = {}
    gantt = []

    current_time = procs[0]['arrival_time'] if procs else 0.0
    ready_queue = []
    proc_index = 0

    # Add initially arrived processes
    while proc_index < n and procs[proc_index]['arrival_time'] <= current_time:
        ready_queue.append(procs[proc_index])
        proc_index += 1

    while ready_queue or proc_index < n:
        if not ready_queue:
            # Jump to next arrival
            if proc_index < n:
                current_time = procs[proc_index]['arrival_time']
                while proc_index < n and \
                        procs[proc_index]['arrival_time'] <= current_time:
                    ready_queue.append(procs[proc_index])
                    proc_index += 1
            else:
                break

        current = ready_queue.pop(0)
        pid = current['pid']

        exec_time = min(remaining_burst[pid], quantum)
        start = current_time
        end = current_time + exec_time

        gantt.append({
            "pid": pid,
            "name": current['name'],
            "start": float(round(start, 2)),
            "end": float(round(end, 2)),
            "color": color_map.get(pid, "#6366f1"),
        })

        remaining_burst[pid] -= exec_time
        current_time = end

        # Add newly arrived processes to ready queue
        while proc_index < n and \
                procs[proc_index]['arrival_time'] <= current_time:
            ready_queue.append(procs[proc_index])
            proc_index += 1

        # Re-add current process if not finished
        if remaining_burst[pid] > 0:
            ready_queue.append(current)
        else:
            completion[pid] = current_time

    # Compute per-process metrics
    # avg burst for starvation detection
    total_burst = sum(p['burst_time'] for p in procs)
    avg_burst = total_burst / n if n > 0 else 0.0

    process_metrics = []
    for p in procs:
        pid = p['pid']
        comp_time = completion.get(pid, current_time)
        turnaround = comp_time - p['arrival_time']
        waiting = turnaround - p['burst_time']
        starved = waiting > config.STARVATION_THRESHOLD * avg_burst

        process_metrics.append({
            "pid": pid,
            "waiting_time": float(round(max(0.0, waiting), 2)),
            "turnaround_time": float(round(turnaround, 2)),
            "completion_time": float(round(comp_time, 2)),
            "starved": starved,
        })

    return {
        "algorithm": "Round Robin",
        "gantt": gantt,
        "process_metrics": process_metrics,
        "avg_burst": avg_burst,  # actual burst avg for starvation detection
    }


def run_sjf(processes: list[dict],
            color_map: dict) -> dict:
    """Non-preemptive Shortest Job First."""
    remaining = copy.deepcopy(processes)
    n = len(remaining)

    current_time = min(p['arrival_time'] for p in remaining) \
        if remaining else 0.0
    gantt = []
    process_metrics = []

    total_burst = sum(p['burst_time'] for p in remaining)
    avg_burst = total_burst / n if n > 0 else 0.0

    while remaining:
        arrived = [p for p in remaining
                   if p['arrival_time'] <= current_time]

        if not arrived:
            current_time = min(p['arrival_time'] for p in remaining)
            continue

        # Select shortest burst time
        selected = min(arrived, key=lambda x: x['burst_time'])

        start = current_time
        end = current_time + selected['burst_time']

        gantt.append({
            "pid": selected['pid'],
            "name": selected['name'],
            "start": float(round(start, 2)),
            "end": float(round(end, 2)),
            "color": color_map.get(selected['pid'], "#6366f1"),
        })

        waiting_time = start - selected['arrival_time']
        turnaround = end - selected['arrival_time']
        starved = waiting_time > config.STARVATION_THRESHOLD * avg_burst

        process_metrics.append({
            "pid": selected['pid'],
            "waiting_time": float(round(max(0.0, waiting_time), 2)),
            "turnaround_time": float(round(turnaround, 2)),
            "completion_time": float(round(end, 2)),
            "starved": starved,
        })

        current_time = end
        remaining.remove(selected)

    return {
        "algorithm": "SJF",
        "gantt": gantt,
        "process_metrics": process_metrics,
        "avg_burst": avg_burst,
    }
