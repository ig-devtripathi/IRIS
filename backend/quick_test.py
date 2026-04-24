import data_layer
import simulator
import metrics

# Quick test with seed=42
processes = data_layer.generate_synthetic_processes(10, seed=42)
print('Generated 10 processes')
results = simulator.run_all(processes, time_quantum=4)
computed = metrics.compute_all(results)

for algo in ['iris', 'round_robin', 'sjf']:
    m = computed[algo]
    print(f"\n{algo.upper()}: wait={m['avg_waiting_time']:.1f}ms, fairness={m['fairness_index']:.4f}, starved={m['starved_count']}, composite={m['composite_score']:.2f}")

winner_key = max(['iris', 'round_robin', 'sjf'], key=lambda k: computed[k]['composite_score'])
print(f"\nWINNER: {winner_key.upper()} (composite_score)")
