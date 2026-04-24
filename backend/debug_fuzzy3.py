import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl

# Build exact system like fuzzy_engine.build_system('pure')
waiting_time = ctrl.Antecedent(np.arange(0, 101, 1), 'waiting_time')
burst = ctrl.Antecedent(np.arange(0, 101, 1), 'burst_estimate')
priority = ctrl.Antecedent(np.arange(0, 11, 1), 'priority')
score = ctrl.Consequent(np.arange(0, 10.1, 0.1), 'scheduling_score')

waiting_time['low'] = fuzz.trimf(waiting_time.universe, [0, 0, 40])
waiting_time['medium'] = fuzz.trimf(waiting_time.universe, [20, 50, 80])
waiting_time['high'] = fuzz.trimf(waiting_time.universe, [60, 100, 100])

burst['short'] = fuzz.trimf(burst.universe, [0, 0, 35])
burst['medium'] = fuzz.trimf(burst.universe, [20, 50, 80])
burst['long'] = fuzz.trimf(burst.universe, [65, 100, 100])

priority['low'] = fuzz.trimf(priority.universe, [0, 0, 4])
priority['medium'] = fuzz.trimf(priority.universe, [3, 5, 7])
priority['high'] = fuzz.trimf(priority.universe, [6, 10, 10])

score['very_low'] = fuzz.trimf(score.universe, [0, 0, 2.5])
score['low'] = fuzz.trimf(score.universe, [1.5, 3, 4.5])
score['medium'] = fuzz.trimf(score.universe, [3.5, 5, 6.5])
score['high'] = fuzz.trimf(score.universe, [5.5, 7, 8.5])
score['very_high'] = fuzz.trimf(score.universe, [7.5, 10, 10])

# Define rules (shared only)
R01 = ctrl.Rule(waiting_time['high'] & priority['high'], score['very_high'])
R02 = ctrl.Rule(waiting_time['high'] & burst['short'], score['very_high'])
R03 = ctrl.Rule(waiting_time['high'] & burst['medium'], score['high'])
R04 = ctrl.Rule(waiting_time['medium'] & priority['high'], score['high'])
R05 = ctrl.Rule(priority['high'] & burst['short'], score['high'])
R06 = ctrl.Rule(priority['medium'] & burst['short'], score['medium'])
R07 = ctrl.Rule(priority['low'] & burst['long'], score['low'])
R08 = ctrl.Rule(waiting_time['low'] & burst['long'], score['very_low'])
R13 = ctrl.Rule(waiting_time['high'] & burst['long'], score['high'])
R14 = ctrl.Rule(waiting_time['high'], score['very_high'])
R15 = ctrl.Rule(waiting_time['high'] & priority['low'], score['very_high'])
R16 = ctrl.Rule(waiting_time['medium'], score['medium'])
R17 = ctrl.Rule(waiting_time['low'], score['medium'])

rules = [R01,R02,R03,R04,R05,R06,R07,R08,R13,R14,R15,R16,R17]
cs = ctrl.ControlSystem(rules)
print(f'Built {len(rules)} rules')

# Test a variety of inputs
test_cases = [
    (0, 50, 5),    # new process: low wait, med burst, med priority
    (50, 50, 5),   # medium wait
    (80, 20, 3),   # high wait, short burst, low priority
    (10, 90, 9),   # low wait, long burst, high priority
    (70, 80, 2),   # high wait, long burst, low priority
]

for (wt, bt, pr) in test_cases:
    sim = ctrl.ControlSystemSimulation(cs)
    sim.input['waiting_time'] = wt
    sim.input['burst_estimate'] = bt
    sim.input['priority'] = pr
    try:
        sim.compute()
        s = sim.output.get('scheduling_score', 'MISSING')
        print(f'wt={wt}, bt={bt}, pr={pr} -> score={s}')
    except Exception as e:
        print(f'wt={wt}, bt={bt}, pr={pr} -> ERROR: {e}')
