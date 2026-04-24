import fuzzy_engine
import traceback
import logging
logging.basicConfig(level=logging.DEBUG)

cs = fuzzy_engine.build_system('pure')
print('Rules:', len(list(cs.rules)))

test_proc = [{
    'pid': 1,
    'name': 'test',
    'waiting_time': 50.0,
    'burst_time': 50.0,
    'priority': 5
}]
try:
    scored = fuzzy_engine.score_processes(test_proc, cs, 'pure')
    print('Result:', scored[0].get('scheduling_score'))
    print('Rule log:', scored[0].get('rule_log', []))
except Exception as e:
    print('Failed:', e)
    traceback.print_exc()
