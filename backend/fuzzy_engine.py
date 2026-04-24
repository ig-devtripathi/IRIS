import numpy as np
import skfuzzy as fuzz
from skfuzzy import control as ctrl
import iris_config as config
import copy
import logging

logger = logging.getLogger(__name__)

# Module-level cache for ControlSystem objects (stateless rule sets)
_cs_pure = None
_cs_ai = None


def build_system(mode: str = "pure") -> ctrl.ControlSystem:
    """Constructs and caches Mamdani ControlSystem for the given mode."""
    global _cs_pure, _cs_ai

    if mode == "pure" and _cs_pure is not None:
        return _cs_pure
    if mode == "ai" and _cs_ai is not None:
        return _cs_ai

    # --- Antecedents ---
    waiting_time = ctrl.Antecedent(np.arange(0, 101, 1), 'waiting_time')
    burst = ctrl.Antecedent(np.arange(0, 101, 1), 'burst_estimate')
    priority = ctrl.Antecedent(np.arange(0, 11, 1), 'priority')

    # --- Consequent ---
    score = ctrl.Consequent(np.arange(0, 10.1, 0.1), 'scheduling_score')

    # --- Membership Functions ---
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

    # --- Shared rules (R01–R08) ---
    R01 = ctrl.Rule(waiting_time['high'] & priority['high'],
                    score['very_high'])
    R02 = ctrl.Rule(waiting_time['high'] & burst['short'],
                    score['very_high'])
    R03 = ctrl.Rule(waiting_time['high'] & burst['medium'],
                    score['high'])
    R04 = ctrl.Rule(waiting_time['medium'] & priority['high'],
                    score['high'])
    R05 = ctrl.Rule(priority['high'] & burst['short'],
                    score['high'])
    R06 = ctrl.Rule(priority['medium'] & burst['short'],
                    score['medium'])
    # R07: Only penalize low priority + long burst when waiting is LOW
    # Once waiting becomes high, anti-starvation rules override with very_high boost
    R07 = ctrl.Rule(priority['low'] & burst['long'] & waiting_time['low'],
                    score['low'])
    R08 = ctrl.Rule(waiting_time['low'] & burst['long'],
                    score['very_low'])

    # Anti-starvation rules — IRIS's core identity
    # R13: Long burst + high wait → high (helps long jobs that are waiting)
    R13 = ctrl.Rule(
        waiting_time['high'] & burst['long'],
        score['high']
    )
    # R14: ANY process waiting too long -> very_high (strong aging boost)
    # This ensures IRIS is starvation-free as waiting time eventually overrides all
    R14 = ctrl.Rule(
        waiting_time['high'],
        score['very_high']
    )
    # R15: Long wait + low priority -> very_high (anti-starvation for low-priority tasks)
    R15 = ctrl.Rule(
        waiting_time['high'] & priority['low'],
        score['very_high']
    )

    shared_rules = [R01, R02, R03, R04, R05,
                    R06, R07, R08, R13, R14, R15]

    if mode == "ai":
        # --- AI mode: add behavior_score antecedent ---
        behavior = ctrl.Antecedent(
            np.arange(0, 1.01, 0.01), 'behavior_score')
        behavior['io_bound'] = fuzz.trimf(behavior.universe, [0.0, 0.0, 0.4])
        behavior['mixed'] = fuzz.trimf(behavior.universe, [0.3, 0.5, 0.7])
        behavior['cpu_bound'] = fuzz.trimf(behavior.universe, [0.6, 1.0, 1.0])

        R09 = ctrl.Rule(behavior['cpu_bound'] & waiting_time['high'],
                        score['high'])
        R10 = ctrl.Rule(behavior['io_bound'] & priority['medium'],
                        score['medium'])
        R11 = ctrl.Rule(behavior['mixed'] & waiting_time['medium'],
                        score['medium'])
        R12 = ctrl.Rule(priority['low'] & waiting_time['low'],
                        score['very_low'])

        rules_list = shared_rules + [R09, R10, R11, R12]
    else:
        # --- Pure mode: burst/priority interaction rules ---
        R09p = ctrl.Rule(burst['short'] & priority['medium'],
                         score['medium'])
        # R10p: Only penalize medium burst + low priority when waiting is LOW
        # Avoids punishing starving low-priority processes that have waited long
        R10p = ctrl.Rule(burst['medium'] & priority['low'] & waiting_time['low'],
                         score['low'])
        R11p = ctrl.Rule(burst['long'] & priority['high'],
                         score['medium'])
        R12p = ctrl.Rule(priority['low'] & waiting_time['low'],
                         score['very_low'])

        rules_list = shared_rules + [R09p, R10p, R11p, R12p]

    scoring_ctrl = ctrl.ControlSystem(rules_list)

    if mode == "pure":
        _cs_pure = scoring_ctrl
    else:
        _cs_ai = scoring_ctrl

    logger.info(f"Fuzzy system built for mode='{mode}' with {len(rules_list)} rules")
    return scoring_ctrl


def score_processes(processes: list[dict],
                    cs: ctrl.ControlSystem,
                    mode: str = "pure") -> list[dict]:
    """Runs Mamdani inference on each process. Never mutates input."""
    scored = []

    # Rule descriptions for logging
    if mode == "ai":
        rule_descriptions = [
            "R01: waiting_time[high] & priority[high] → very_high",
            "R02: waiting_time[high] & burst[short] → very_high",
            "R03: waiting_time[high] & burst[medium] → high",
            "R04: waiting_time[medium] & priority[high] → high",
            "R05: priority[high] & burst[short] → high",
            "R06: priority[medium] & burst[short] → medium",
            "R07: priority[low] & burst[long] → low",
            "R08: waiting_time[low] & burst[long] → very_low",
            "R09: behavior[cpu_bound] & waiting_time[high] → high",
            "R10: behavior[io_bound] & priority[medium] → medium",
            "R11: behavior[mixed] & waiting_time[medium] → medium",
            "R12: priority[low] & waiting_time[low] → very_low",
            "R13: waiting_time[high] & burst[long] → high",
            "R14: waiting_time[high] → very_high",
            "R15: waiting_time[high] & priority[low] → very_high",
        ]
    else:
        rule_descriptions = [
            "R01: waiting_time[high] & priority[high] → very_high",
            "R02: waiting_time[high] & burst[short] → very_high",
            "R03: waiting_time[high] & burst[medium] → high",
            "R04: waiting_time[medium] & priority[high] → high",
            "R05: priority[high] & burst[short] → high",
            "R06: priority[medium] & burst[short] → medium",
            "R07: priority[low] & burst[long] → low",
            "R08: waiting_time[low] & burst[long] → very_low",
            "R09p: burst[short] & priority[medium] → medium",
            "R10p: burst[medium] & priority[low] → low",
            "R11p: burst[long] & priority[high] → medium",
            "R12p: priority[low] & waiting_time[low] → very_low",
            "R13: waiting_time[high] & burst[long] → high",
            "R14: waiting_time[high] → very_high",
            "R15: waiting_time[high] & priority[low] → very_high",
        ]

    for p in processes:
        proc = copy.deepcopy(p)

        wt = float(np.clip(proc.get('waiting_time', 0), 0, 100))
        bt = float(np.clip(proc['burst_time'], 0, 100))
        pr = float(np.clip(proc['priority'], 0, 10))

        try:
            # Fresh simulation per process to avoid stale state
            sim = ctrl.ControlSystemSimulation(cs)
            sim.input['waiting_time'] = wt
            sim.input['burst_estimate'] = bt
            sim.input['priority'] = pr

            if mode == "ai":
                bs = float(np.clip(proc.get('behavior_score', 0.5), 0, 1))
                sim.input['behavior_score'] = bs

            sim.compute()
            proc['scheduling_score'] = float(
                round(sim.output['scheduling_score'], 2))

            # Build rule_log — select relevant rules based on inputs
            rule_log = _build_rule_log(wt, bt, pr,
                                        proc.get('behavior_score', None),
                                        mode, rule_descriptions)
            proc['rule_log'] = rule_log

        except Exception as e:
            logger.warning(f"Compute error for PID {proc.get('pid')}: {e}")
            proc['scheduling_score'] = 5.0
            proc['rule_log'] = ["Compute error — using default score 5.0"]

        scored.append(proc)

    return scored


def _build_rule_log(wt: float, bt: float, pr: float,
                     bs: float, mode: str,
                     rule_descriptions: list[str]) -> list[str]:
    """Builds a human-readable rule log based on input values."""
    log = []

    # Tier 1 — Urgency rules
    if wt > 60:
        if pr > 6:
            log.append(rule_descriptions[0])
        if bt < 35:
            log.append(rule_descriptions[1])
        if wt > 80:
            log.append(rule_descriptions[13])  # R14
            if pr < 4:
                log.append(rule_descriptions[14])  # R15
    if wt > 50:
        log.append(rule_descriptions[13])  # R14 (early aging boost)
    if 20 <= wt <= 80 and pr > 6:
        log.append(rule_descriptions[3])

    # Tier 2 — Efficiency rules
    if pr > 6 and bt < 35:
        log.append(rule_descriptions[4])
    if 3 <= pr <= 7 and bt < 35:
        log.append(rule_descriptions[5])
    if pr < 4 and bt > 65:
        log.append(rule_descriptions[6])
    if wt < 40 and bt > 65:
        log.append(rule_descriptions[7])

    # Tier 3 — Mode-specific rules
    if mode == "ai" and bs is not None:
        if bs > 0.6 and wt > 60:
            log.append(rule_descriptions[8])
        if bs < 0.4 and 3 <= pr <= 7:
            log.append(rule_descriptions[9])
        if 0.3 <= bs <= 0.7 and 20 <= wt <= 80:
            log.append(rule_descriptions[10])
    else:
        if bt < 35 and 3 <= pr <= 7:
            log.append(rule_descriptions[8])
        if 20 <= bt <= 80 and pr < 4:
            log.append(rule_descriptions[9])
        if bt > 65 and pr > 6:
            log.append(rule_descriptions[10])

    if pr < 4 and wt < 40:
        log.append(rule_descriptions[11])

    # Deduplicate while preserving order
    seen = set()
    unique_log = []
    for entry in log:
        if entry not in seen:
            seen.add(entry)
            unique_log.append(entry)

    # Only show actually fired rules
    # Do not pad with unfired rules — misleading
    pass

    return unique_log


def heuristic_classify(processes: list[dict]) -> list[dict]:
    """Adds behavior_score and workload_type using name/cpu pattern matching."""
    result = copy.deepcopy(processes)

    cpu_bound_names = [
        "python", "java", "gcc", "g++", "ffmpeg", "blender",
        "compile", "jupyter", "pytorch", "tensorflow", "make",
    ]
    io_bound_names = [
        "idle", "svchost", "system", "dropbox", "antivirus",
        "backup", "explorer", "finder", "spotlight", "winlogon",
    ]
    mixed_names = [
        "chrome", "firefox", "mysqld", "nginx", "node", "postgres",
        "redis", "docker", "code", "teams",
    ]

    for p in result:
        name_lower = p.get('name', '').lower()
        cpu = p.get('cpu_percent', 0.0)
        classified = False

        for pattern in cpu_bound_names:
            if pattern in name_lower:
                p['workload_type'] = 'cpu_bound'
                p['behavior_score'] = 0.8
                classified = True
                break

        if not classified:
            for pattern in io_bound_names:
                if pattern in name_lower:
                    p['workload_type'] = 'io_bound'
                    p['behavior_score'] = 0.2
                    classified = True
                    break

        if not classified:
            for pattern in mixed_names:
                if pattern in name_lower:
                    p['workload_type'] = 'mixed'
                    p['behavior_score'] = 0.5
                    classified = True
                    break

        if not classified:
            if cpu > 50:
                p['workload_type'] = 'cpu_bound'
                p['behavior_score'] = 0.75
            elif cpu > 20:
                p['workload_type'] = 'mixed'
                p['behavior_score'] = 0.5
            else:
                p['workload_type'] = 'io_bound'
                p['behavior_score'] = 0.2

        p['burst_confidence'] = 'medium'
        p['reasoning'] = 'Classified by heuristic pattern matching'

    return result


def get_fis_pure():
    """Returns cached pure-mode ControlSystem, building if necessary."""
    global _cs_pure
    if _cs_pure is None:
        _cs_pure = build_system("pure")
    return _cs_pure


def get_fis_ai():
    """Returns cached AI-mode ControlSystem, building if necessary."""
    global _cs_ai
    if _cs_ai is None:
        _cs_ai = build_system("ai")
    return _cs_ai
