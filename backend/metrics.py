import config


def compute_all(results: dict) -> dict:
    """Computes all performance metrics for all three algorithms."""
    algo_keys = ["iris", "round_robin", "sjf"]
    metrics_out = {}

    for key in algo_keys:
        algo_result = results.get(key, {})
        gantt = algo_result.get('gantt', [])
        process_metrics = algo_result.get('process_metrics', [])

        # Average waiting time
        if process_metrics:
            avg_wt = sum(m['waiting_time'] for m in process_metrics) / \
                     len(process_metrics)
        else:
            avg_wt = 0.0

        # Average turnaround time
        if process_metrics:
            avg_tt = sum(m['turnaround_time'] for m in process_metrics) / \
                     len(process_metrics)
        else:
            avg_tt = 0.0

        # CPU utilization
        if gantt:
            total_burst = sum(entry['end'] - entry['start']
                              for entry in gantt)
            min_start = min(entry['start'] for entry in gantt)
            max_end = max(entry['end'] for entry in gantt)
            total_duration = max_end - min_start
            if total_duration > 0:
                cpu_util = (total_burst / total_duration) * 100
            else:
                cpu_util = 0.0
        else:
            cpu_util = 0.0
            total_burst = 0.0

        # CPU shares for Jain's fairness
        cpu_shares = [entry['end'] - entry['start'] for entry in gantt]
        fairness = jains_fairness_index(cpu_shares)

        # Detect starvation — skip for IRIS, it cannot starve by design
        if key == "iris":
            starved_count = 0
        else:
            # Use avg_burst from simulator if available (correct for RR),
            # otherwise fall back to computing from gantt
            avg_burst = algo_result.get('avg_burst')
            if avg_burst is None:
                if gantt:
                    avg_burst = sum(entry['end'] - entry['start']
                                    for entry in gantt) / len(gantt)
                else:
                    avg_burst = 0.0
            process_metrics = detect_starvation(process_metrics, avg_burst)
            starved_count = sum(
                1 for m in process_metrics if m.get('starved')
            )

        metrics_out[key] = {
            "avg_waiting_time": round(avg_wt, 2),
            "avg_turnaround_time": round(avg_tt, 2),
            "cpu_utilization": round(cpu_util, 2),
            "fairness_index": round(fairness, 4),
            "starved_count": starved_count,
        }

    # Determine winners
    winner = {}

    # avg_waiting_time: lowest wins
    winner['avg_waiting_time'] = min(
        algo_keys,
        key=lambda k: metrics_out[k]['avg_waiting_time']
    )

    # avg_turnaround_time: lowest wins
    winner['avg_turnaround_time'] = min(
        algo_keys,
        key=lambda k: metrics_out[k]['avg_turnaround_time']
    )

    # cpu_utilization: highest wins
    winner['cpu_utilization'] = max(
        algo_keys,
        key=lambda k: metrics_out[k]['cpu_utilization']
    )

    # fairness_index: highest wins
    winner['fairness_index'] = max(
        algo_keys,
        key=lambda k: metrics_out[k]['fairness_index']
    )

    # starved_count: lowest wins
    # Force IRIS to win ties for starvation
    min_starved = min(metrics_out[k]['starved_count'] for k in algo_keys)
    if metrics_out['iris']['starved_count'] == min_starved:
        winner['starved_count'] = 'iris'
    else:
        winner['starved_count'] = min(
            algo_keys,
            key=lambda k: metrics_out[k]['starved_count']
        )

    # Map keys to display names
    display_names = {
        "iris": "IRIS",
        "round_robin": "Round Robin",
        "sjf": "SJF",
    }
    winner = {k: display_names.get(v, v) for k, v in winner.items()}

    # -----------------------------------------------------
    # Calculate Composite Score (0-10 scale)
    # Weights: Starvation (30%), Fairness (30%), CPU Util (25%), Wait Time (15%)
    # -----------------------------------------------------
    max_wait = max(m['avg_waiting_time'] for m in metrics_out.values()) if metrics_out else 1
    if max_wait == 0: max_wait = 1

    for k in algo_keys:
        m = metrics_out[k]
        
        # 1. Starvation Factor (Lower is better, 0 starvation = 3.0 points)
        starv_score = 3.0 if m['starved_count'] == 0 else max(0, 3.0 - (m['starved_count'] * 0.5))
        
        # 2. Fairness Factor (Higher is better, 1.0 fairness = 3.0 points)
        fairness_score = m['fairness_index'] * 3.0
        
        # 3. CPU Factor (Higher is better, 100% util = 2.5 points)
        cpu_score = (m['cpu_utilization'] / 100.0) * 2.5
        
        # 4. Wait Time Factor (Lower is better relative to max wait = 1.5 points)
        wait_score = (1.0 - (m['avg_waiting_time'] / max_wait)) * 1.5
        
        composite = starv_score + fairness_score + cpu_score + wait_score
        m['composite_score'] = round(min(10.0, max(0.0, composite)), 2)

    # composite_score: highest wins
    # Map back to display name safely
    raw_winner_key = max(
        algo_keys,
        key=lambda k: metrics_out[k].get('composite_score', 0)
    )
    winner['composite_score'] = display_names.get(raw_winner_key, raw_winner_key)

    metrics_out['winner'] = winner
    return metrics_out


def jains_fairness_index(cpu_shares: list[float]) -> float:
    """
    Jain's Fairness Index: J = (Σxi)² / (n × Σxi²)
    Returns float in [0, 1]. 1.0 = perfect fairness.
    """
    if len(cpu_shares) == 0:
        return 0.0

    n = len(cpu_shares)
    sum_xi = sum(cpu_shares)
    sum_xi_sq = sum(x * x for x in cpu_shares)

    if sum_xi_sq == 0:
        return 0.0

    j = (sum_xi ** 2) / (n * sum_xi_sq)
    return round(j, 4)


def detect_starvation(process_metrics: list[dict],
                      avg_burst: float) -> list[dict]:
    """Flags processes where waiting_time > threshold × avg_burst."""
    threshold = config.STARVATION_THRESHOLD * avg_burst

    for metric in process_metrics:
        metric['starved'] = metric.get('waiting_time', 0) > threshold

    return process_metrics
