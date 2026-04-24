from dotenv import load_dotenv
import os

load_dotenv()

# API Keys — loaded from .env, never hardcoded
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# AI Models
GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
GROQ_MODEL = "llama-3.3-70b-versatile"

# Simulation defaults
DEFAULT_PROCESS_COUNT = 10
DEFAULT_TIME_QUANTUM = 4
MAX_BURST_TIME = 100.0
MAX_ARRIVAL_TIME = 50.0
PRIORITY_RANGE = (1, 10)
STARVATION_THRESHOLD = 2.0

# CORS
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000"]

# App identity
VERSION = "1.0.0"
APP_TITLE = "IRIS — Intelligent Resource Inference Scheduler"

# Fuzzy universe constants
WAITING_TIME_RANGE = (0, 100)
BURST_RANGE = (0, 100)
PRIORITY_RANGE_FUZZY = (0, 10)
BEHAVIOR_RANGE = (0.0, 1.0)
SCORE_RANGE = (0, 10)
