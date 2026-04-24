import data_layer
import simulator

processes = data_layer.generate_synthetic_processes(10, seed=42)
results = simulator.run_all(processes, time_quantum=4)

# Print IRIS order (by completion time)
iris_metrics = results['iris']['process_metrics']
iris_sorted = sorted(iris_metrics, key=lambda x: x['completion_time'])
print('IRIS scheduling order (by completion_time):')
for i, m in enumerate(iris_sorted, 1):
    pid = m['pid']
    proc = next(p for p in processes if p['pid']==pid)
    print(f"{i}. PID {pid} (burst={proc['burst_time']:.1f}, prio={proc['priority']}, arrival={proc['arrival_time']:.1f}) -> wait={m['waiting_time']:.1f}, turnaround={m['turnaround_time']:.1f}")

# Compute avg_burst and threshold
iris_gantt = results['iris']['gantt']
avg_burst = sum(e['end']-e['start'] for e in iris_gantt) / len(iris_gantt)
print(f'\nAvg burst: {avg_burst:.2f}, Starv thresh: {2*avg_burst:.2f}')

# Also print RR and SJF starvation for comparison
for algo in ['round_robin', 'sjf']:
    metrics = results[algo]['process_metrics']
    gantt = results[algo]['gantt']
    avg_br = sum(e['end']-e['start'] for e in gantt) / len(gantt)
    starved = sum(1 for m in metrics if m['waiting_time'] > 2*avg_br)
    print(f'{algo}: starved (by our calc) = {starved}')
