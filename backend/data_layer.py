import psutil
import numpy as np
import copy
import config


def get_live_processes(limit: int = 15) -> list[dict]:
    """Fetches real processes from host OS via psutil. Never raises."""
    processes = []
    try:
        for proc in psutil.process_iter(
            ['pid', 'name', 'cpu_percent', 'memory_percent', 'nice', 'status']
        ):
            try:
                info = proc.info
                pid = info.get('pid', 0)
                if pid < 10:
                    continue
                status = info.get('status', '')
                if status == 'zombie':
                    continue
                name = info.get('name', None)
                if not name:
                    continue

                cpu_percent = info.get('cpu_percent', 0.0) or 0.0
                memory_percent = info.get('memory_percent', 0.0) or 0.0
                nice = info.get('nice', 0)
                if nice is None:
                    nice = 0

                # Normalize nice (-20 to +20) to priority (1-10)
                priority = int(((nice + 20) / 40) * 9) + 1
                priority = max(1, min(10, priority))

                # Normalize cpu_percent to burst_time
                burst_time = max(5.0, min(100.0, cpu_percent))

                # Clamp memory_percent
                memory_percent = max(0.0, min(100.0, memory_percent))

                processes.append({
                    "pid": pid,
                    "name": name,
                    "burst_time": float(burst_time),
                    "arrival_time": float(round(len(processes) * 1.5, 1)),
                    "priority": priority,
                    "cpu_percent": max(0.0, min(100.0, cpu_percent)),
                    "memory_percent": memory_percent,
                })

                if len(processes) >= limit:
                    break

            except (psutil.NoSuchProcess, psutil.AccessDenied,
                    psutil.ZombieProcess):
                continue
    except Exception:
        return []

    return processes


def generate_synthetic_processes(n: int = 10,
                                  seed: int = None) -> list[dict]:
    """Generates n synthetic processes with realistic distributions."""
    if seed is not None:
        np.random.seed(seed)

    name_pool = [
        "chrome.exe", "python.exe", "mysqld", "nginx", "gcc",
        "node.exe", "svchost.exe", "java", "code.exe", "explorer.exe",
        "ffmpeg", "postgres", "redis-server", "docker", "vim",
        "bash", "powershell", "antivirus.exe", "dropbox", "teams.exe",
    ]

    burst_time = np.random.exponential(scale=40, size=n)
    burst_time = np.clip(burst_time, 5.0, 100.0)

    arrival_time = np.cumsum(np.random.poisson(lam=3, size=n)).astype(float)
    # Normalize to 0-40ms range instead of clipping
    # This prevents multiple processes bunching at 50ms
    if arrival_time[-1] > 0:
        arrival_time = (arrival_time / arrival_time[-1]) * 40.0
    arrival_time = np.round(arrival_time, 2)

    priority = np.random.randint(1, 11, size=n)

    cpu_percent = burst_time * 0.8 + np.random.normal(0, 5, n)
    cpu_percent = np.clip(cpu_percent, 0.0, 100.0)

    memory_percent = np.random.uniform(0.5, 15.0, size=n)

    processes = []
    for i in range(n):
        processes.append({
            "pid": 1001 + i,
            "name": name_pool[i % len(name_pool)],
            "burst_time": float(round(burst_time[i], 2)),
            "arrival_time": float(round(arrival_time[i], 2)),
            "priority": int(priority[i]),
            "cpu_percent": float(round(cpu_percent[i], 2)),
            "memory_percent": float(round(memory_percent[i], 2)),
        })

    return processes


def load_preset(name: str) -> list[dict]:
    """Returns predefined process queue for demo scenarios."""
    if name == "heavy_cpu":
        names = ["gcc", "python.exe", "ffmpeg", "java", "blender",
                 "compile", "pytorch", "tensorflow", "make", "g++"]
        burst_times = [78.4, 65.2, 88.1, 72.5, 90.3,
                       60.7, 85.6, 92.0, 68.4, 74.9]
        priorities = [8, 7, 9, 8, 10, 7, 9, 10, 8, 7]
        cpu_percents = [82.1, 70.3, 91.5, 75.8, 95.0,
                        68.2, 88.4, 93.7, 72.0, 78.5]
        memory_percents = [5.4, 8.2, 4.1, 12.3, 6.7,
                           3.9, 14.5, 11.2, 2.8, 7.6]
        arrival_times = [0.0, 2.5, 5.0, 8.0, 10.5,
                         13.0, 16.5, 19.0, 22.0, 25.5]

    elif name == "mixed_load":
        names = ["chrome.exe", "mysqld", "nginx", "node.exe",
                 "code.exe", "postgres", "redis-server", "docker",
                 "teams.exe", "vim"]
        burst_times = [45.2, 38.7, 32.1, 55.6, 42.8,
                       48.3, 30.5, 58.9, 35.4, 40.1]
        priorities = [5, 6, 4, 7, 3, 8, 4, 6, 5, 3]
        cpu_percents = [40.5, 35.2, 25.8, 52.1, 38.7,
                        45.3, 28.9, 65.4, 30.1, 42.0]
        memory_percents = [8.5, 6.3, 2.1, 4.7, 10.2,
                           7.8, 1.5, 9.4, 12.1, 3.6]
        arrival_times = [0.0, 3.0, 5.5, 7.0, 10.0,
                         12.5, 15.0, 17.5, 20.0, 23.0]

    elif name == "io_intensive":
        names = ["svchost.exe", "explorer.exe", "antivirus.exe",
                 "dropbox", "backup.exe", "spotlight", "finder",
                 "idle", "system", "winlogon.exe"]
        burst_times = [12.3, 8.7, 18.5, 15.2, 22.1,
                       5.8, 9.4, 6.1, 24.7, 10.3]
        priorities = [2, 3, 4, 1, 5, 2, 3, 1, 4, 2]
        cpu_percents = [8.2, 5.1, 15.3, 12.0, 20.0,
                        2.5, 7.8, 3.2, 18.4, 6.9]
        memory_percents = [1.2, 2.5, 3.8, 4.1, 1.8,
                           0.9, 2.3, 0.5, 5.2, 1.7]
        arrival_times = [0.0, 1.5, 3.0, 5.5, 7.0,
                         9.0, 11.5, 13.0, 15.5, 17.0]

    else:
        raise ValueError(
            f"Unknown preset '{name}'. Valid: heavy_cpu, mixed_load, io_intensive"
        )

    processes = []
    for i in range(len(names)):
        processes.append({
            "pid": 1001 + i,
            "name": names[i],
            "burst_time": float(burst_times[i]),
            "arrival_time": float(arrival_times[i]),
            "priority": int(priorities[i]),
            "cpu_percent": float(cpu_percents[i]),
            "memory_percent": float(memory_percents[i]),
        })

    return processes


def normalize_processes(processes: list[dict]) -> list[dict]:
    """Clamps all process fields to valid fuzzy universe ranges."""
    result = copy.deepcopy(processes)
    for p in result:
        p['burst_time'] = max(5.0, min(100.0, float(p.get('burst_time', 5.0))))
        p['arrival_time'] = max(0.0, min(50.0, float(p.get('arrival_time', 0.0))))
        p['priority'] = max(1, min(10, int(p.get('priority', 5))))
        p['cpu_percent'] = max(0.0, min(100.0, float(p.get('cpu_percent', 0.0))))
        p['memory_percent'] = max(0.0, min(100.0, float(p.get('memory_percent', 0.0))))
    return result
