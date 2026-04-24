import data_layer
import simulator
import metrics

# Generate test processes
processes = data_layer.generate_synthetic_processes(10, seed=42)
print('Processes:')
for p in processes:
    print(f"  PID {p['pid']:4d}: burst={p['burst_time']:6.2f}, arrival={p['arrival_time']:6.2f}, priority={p['priority']}")

# Run simulation
results = simulator.run_all(processes, time_quantum=4)
computed = metrics.compute_all(results)

# Show IRIS process metrics
print('\n=== IRIS PROCESS METRICS ===')
iris_metrics = results['iris']['process_metrics']
iris_metrics_sorted = sorted(iris_metrics, key=lambda x: x['pid'])
for m in iris_metrics_sorted:
    pid = m['pid']
    burst = next(p['burst_time'] for p in processes if p['pid']==pid)
    arrival = next(p['arrival_time'] for p in processes if p['pid']==pid)
    starved = m['starved']
    print(f"PID {pid}: burst={burst:6.2f}, arrival={arrival:6.2f}, waiting={m['waiting_time']:6.2f}, turnaround={m['turnaround_time']:6.2f}, starved={starved}")

# Show starvation threshold
iris_gantt = results['iris']['gantt']
if iris_gantt:
    avg_burst = sum(e['end']-e['start'] for e in iris_gantt) / len(iris_gantt)
    threshold = 2.0 * avg_burst
    print(f'\nAverage burst (IRIS): {avg_burst:.2f}')
    print(f'Starvation threshold (> {2.0} * avg_burst): {threshold:.2f}')
    print(f'Starved count: {computed["iris"]["starved_count"]}')
    print(f'Fairness index: {computed["iris"]["fairness_index"]}')
    print(f'Composite score: {computed["iris"]["composite_score"]}')
