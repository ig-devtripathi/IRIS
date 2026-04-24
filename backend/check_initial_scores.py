import data_layer
import fuzzy_engine

processes = data_layer.generate_synthetic_processes(10, seed=42)
cs = fuzzy_engine.get_fis_pure()

# Score all initially (waiting_time = 0)
initial = [p.copy() for p in processes]
for p in initial:
    p['waiting_time'] = 0.0

scored = fuzzy_engine.score_processes(initial, cs, 'pure')
print("Initial scores (waiting=0):")
for p in scored:
    print(f"PID {p['pid']}: prio={p['priority']}, burst={p['burst_time']:.1f}, score={p['scheduling_score']:.2f}, rules={p['rule_log']}")
