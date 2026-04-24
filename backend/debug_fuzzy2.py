import fuzzy_engine
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import numpy as np

# Build the same system manually to debug
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

# Define rules including new ones
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

rules = [R01, R02, R03, R04, R05, R06, R07, R08, R13, R14, R15]

cs = ctrl.ControlSystem(rules)
print('Built control system with', len(rules), 'rules')

# Test with specific values
sim = ctrl.ControlSystemSimulation(cs)
sim.input['waiting_time'] = 50.0
sim.input['burst_estimate'] = 50.0
sim.input['priority'] = 5.0

try:
    sim.compute()
    print('Output:', sim.output)
    print('Scheduling score:', sim.output.get('scheduling_score', 'NOT FOUND'))
except Exception as e:
    print('Compute error:', e)
    import traceback
    traceback.print_exc()
