import data_layer
import simulator
import metrics

# Generate test processes with fixed seed for reproducibility
processes = data_layer.generate_synthetic_processes(10, seed=42)
print('Generated 10 processes (seed=42)')
print()

# Score with pure fuzzy mode
scored = simulator.run_all(processes, time_quantum=4)

# Compute metrics
computed = metrics.compute_all(scored)

# Display results
print('=== METRICS ===')
for algo in ['iris', 'round_robin', 'sjf']:
    m = computed[algo]
    print(f'\n{algo.upper()}:')
    print(f'  avg_wait:  {m["avg_waiting_time"]} ms')
    print(f'  fairness:  {m["fairness_index"]}')
    print(f'  starved:   {m["starved_count"]}')
    print(f'  cpu_util:  {m["cpu_utilization"]}%')
    print(f'  composite: {m["composite_score"]} / 10.0')

print('\n=== WINNERS ===')
winner = computed['winner']
for metric, algo in winner.items():
    print(f'  {metric}: {algo}')

print(f'\n>>> COMPOSITE SCORE WINNER: {winner["composite_score"]} <<<')

# Additional runs to verify consistency
print('\n\n=== 5 MORE RUNS TO CHECK CONSISTENCY ===')
for run in range(5):
    seed = 100 + run * 10
    p = data_layer.generate_synthetic_processes(10, seed=seed)
    r = simulator.run_all(p, time_quantum=4)
    c = metrics.compute_all(r)
    iris_score = c['iris']['composite_score']
    rr_score = c['round_robin']['composite_score']
    sjf_score = c['sjf']['composite_score']
    winner_key = max(['iris', 'round_robin', 'sjf'], key=lambda k: c[k]['composite_score'])
    winner_name = {'iris': 'IRIS', 'round_robin': 'RR', 'sjf': 'SJF'}[winner_key]
    print(f'Run {run+1} (seed={seed}): IRIS={iris_score:.2f}, RR={rr_score:.2f}, SJF={sjf_score:.2f} → Winner: {winner_name}')
