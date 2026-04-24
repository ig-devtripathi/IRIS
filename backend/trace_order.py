import data_layer
import simulator
import fuzzy_engine
import copy

# Patch run_iris to log order
original_run_iris = simulator.run_iris

def traced_run_iris(processes, color_map, fis, mode="pure"):
    remaining = copy.deepcopy(processes)
    current_time = min(p['arrival_time'] for p in remaining) if remaining else 0.0
    order = []
    while remaining:
        arrived = [p for p in remaining if p['arrival_time'] <= current_time]
        if not arrived:
            current_time = min(p['arrival_time'] for p in remaining)
            continue
        # Score arrived processes
        scored_arrived = fuzzy_engine.score_processes(arrived, fis, mode)
        selected = max(scored_arrived, key=lambda x: x.get('scheduling_score', 0))
        pid = selected['pid']
        order.append(pid)
        start = current_time
        end = current_time + selected['burst_time']
        current_time = end
        remaining.remove(selected)
        # Update waiting and rescore remaining
        if remaining:
            for r in remaining:
                r['waiting_time'] = max(0.0, current_time - r['arrival_time'])
            remaining = fuzzy_engine.score_processes(remaining, fis, mode)
    # Build gantt etc (simplified)
    return {"algorithm": "IRIS", "gantt": [], "process_metrics": [], "order": order}

# Generate and trace
processes = data_layer.generate_synthetic_processes(10, seed=42)
fis = fuzzy_engine.get_fis_pure()
result = traced_run_iris(processes, {}, fis, 'pure')
print('Scheduling order (PID):', result['order'])
print('Length:', len(result['order']))
