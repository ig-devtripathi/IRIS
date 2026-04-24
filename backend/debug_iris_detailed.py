import data_layer
import simulator

processes = data_layer.generate_synthetic_processes(10, seed=42)
results = simulator.run_all(processes, time_quantum=4)

# Show IRIS order and waiting
iris_metrics = sorted(results['iris']['process_metrics'], key=lambda x: x['completion_time'])
print('IRIS order:')
for m in iris_metrics:
    pid = m['pid']
    p = next(p for p in processes if p['pid']==pid)
    print(f"  PID {pid}: prio={p['priority']}, burst={p['burst_time']:.1f}, arrival={p['arrival_time']:.1f} -> wait={m['waiting_time']:.1f}, starved={m['starved']}")

iris_gantt = results['iris']['gantt']
avg_burst = sum(e['end']-e['start'] for e in iris_gantt) / len(iris_gantt)
print(f"\nAvg burst: {avg_burst:.2f}, Threshold: {2*avg_burst:.2f}")
print(f"Starved: {sum(1 for m in iris_metrics if m['starved'])}")

# Also show initial scores
import fuzzy_engine
fis = fuzzy_engine.get_fis_pure()
initial = [p.copy() for p in processes]
for p in initial:
    p['waiting_time'] = 0.0
scored = fuzzy_engine.score_processes(initial, fis, 'pure')
print("\nInitial scores (waiting=0):")
for p in sorted(scored, key=lambda x: x['pid']):
    print(f"PID {p['pid']}: prio={p['priority']}, burst={p['burst_time']:.1f}, score={p['scheduling_score']:.2f}")
