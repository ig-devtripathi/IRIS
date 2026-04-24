import data_layer
import simulator
import fuzzy_engine
import metrics
import traceback

# Generate test processes
processes = data_layer.generate_synthetic_processes(5, seed=42)
print('Generated 5 processes')

# Score with pure fuzzy mode — catch errors
try:
    scored = fuzzy_engine.score_processes(processes, fuzzy_engine.get_fis_pure(), 'pure')
    print('Scoring succeeded for all processes')
    for p in scored:
        pid = p['pid']
        score = p.get('scheduling_score')
        log = p.get('rule_log', [])
        print(f'PID {pid}: score={score}, rules={len(log)}')
        if score is None:
            print(f'  ERROR: score missing!')
except Exception as e:
    print('Scoring failed:', e)
    traceback.print_exc()
