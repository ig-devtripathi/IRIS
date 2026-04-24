import data_layer
import fuzzy_engine
import traceback

# Generate processes with same seed
processes = data_layer.generate_synthetic_processes(5, seed=42)
print('Processes:')
for p in processes:
    print(f"  PID {p['pid']}: burst={p['burst_time']}, arrival={p['arrival_time']}, priority={p['priority']}")

cs = fuzzy_engine.get_fis_pure()
print(f'\nFIS has {len(list(cs.rules))} rules')

# Score one by one to find failures
for p in processes:
    proc = [p.copy()]
    try:
        scored = fuzzy_engine.score_processes(proc, cs, 'pure')
        result = scored[0]
        print(f"\nPID {p['pid']}:")
        print(f"  waiting_time (initial): {p['arrival_time']} (arrival) but actual waiting in scheduling varies")
        # To see actual waiting used in scoring, we need to see what score_processes passes.
        # The scoring uses current waiting_time from process dict.
        # In initial scoring, waiting_time=0 for all.
        wt = 0  # initially
        bt = p['burst_time']
        pr = p['priority']
        print(f"  inputs: wt={wt}, bt={bt}, pr={pr}")
        print(f"  score: {result['scheduling_score']}")
        print(f"  rules fired: {result['rule_log']}")
        if result['scheduling_score'] == 5.0 and not result['rule_log']:
            print("  *** DEFAULT SCORE - NO RULES FIRED ***")
    except Exception as e:
        print(f"PID {p['pid']} EXCEPTION: {e}")
        traceback.print_exc()
