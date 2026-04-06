import config
import gemini_engine

try:
    print("Testing gemini directly...")
    result = gemini_engine._call_gemini([{'pid': 1, 'name': 'test', 'cpu_percent': 5, 'burst_time': 10, 'priority': 5}])
    print("SUCCESS", result)
except Exception as e:
    import traceback
    traceback.print_exc()
