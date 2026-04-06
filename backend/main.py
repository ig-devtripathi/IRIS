from dotenv import load_dotenv
load_dotenv()

import os
import logging
import datetime
from contextlib import asynccontextmanager
from typing import Optional, Literal
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import config
import data_layer
import gemini_engine
import fuzzy_engine
import simulator
import metrics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Module-level globals
fis_pure = None
fis_ai = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global fis_pure, fis_ai
    fis_pure = fuzzy_engine.build_system("pure")
    fis_ai = fuzzy_engine.build_system("ai")
    logger.info("IRIS fuzzy systems initialized successfully")
    yield


app = FastAPI(
    title=config.APP_TITLE,
    version=config.VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RunRequest(BaseModel):
    mode: Literal["pure", "ai"] = "pure"
    source: Literal["live", "simulated"] = "simulated"
    n_processes: int = Field(default=10, ge=5, le=30)
    time_quantum: int = Field(default=4, ge=1, le=20)
    preset: Optional[Literal[
        "heavy_cpu", "mixed_load", "io_intensive"]] = None


@app.post("/api/run")
async def run_simulation(params: RunRequest):
    """Execute the full IRIS pipeline."""
    # Step 1: Acquire processes
    if params.preset:
        processes = data_layer.load_preset(params.preset)
        actual_source = "preset"
    elif params.source == "live":
        processes = data_layer.get_live_processes(params.n_processes)
        actual_source = "live"
    else:
        processes = data_layer.generate_synthetic_processes(
            params.n_processes)
        actual_source = "simulated"

    # Step 2: Validate
    if len(processes) == 0 and params.source == "live":
        raise HTTPException(
            status_code=400,
            detail="psutil returned 0 valid processes. "
                   "Switch to simulated mode."
        )

    # Step 3: Classify workload
    enriched, active_ai = gemini_engine.classify(
        processes, params.mode)

    # Step 4: Select FIS
    fis = fis_ai if params.mode == "ai" else fis_pure
    mode_str = params.mode

    # Step 5: Score processes
    scored = fuzzy_engine.score_processes(enriched, fis, mode_str)

    # Step 6: Run simulations
    sim_results = simulator.run_all(scored, params.time_quantum)

    # Step 7: Compute metrics
    computed_metrics = metrics.compute_all(sim_results)

    # Step 8: Generate research summary
    summary_data = gemini_engine.generate_research_summary(
        scored, sim_results, computed_metrics, active_ai)

    # Step 9: Build response
    response_data = {
        "meta": {
            "mode": params.mode,
            "source": actual_source,
            "active_ai": active_ai,
            "summary_generator": summary_data.get("generator", "none"),
            "n_processes": len(processes),
            "time_quantum": params.time_quantum,
            "timestamp": datetime.datetime.utcnow().isoformat() + "Z",
        },
        "processes": scored,
        "results": sim_results,
        "metrics": computed_metrics,
        "research_summary": summary_data.get("text", ""),
    }
    return response_data


@app.get("/api/health")
async def health_check():
    """System health check."""
    return {
        "status": "healthy",
        "version": config.VERSION,
        "services": {
            "gemini": "available" if config.GEMINI_API_KEY
                      else "not_configured",
            "groq": "available" if config.GROQ_API_KEY
                    else "not_configured",
            "psutil": "available",
            "fuzzy_engine": "initialized" if fis_pure is not None
                           else "not_initialized",
        },
        "modes_available": ["pure", "ai"],
        "sources_available": ["live", "simulated"],
    }


@app.get("/api/presets/{name}")
async def get_preset(name: str):
    """Retrieve a predefined process queue."""
    descriptions = {
        "heavy_cpu": "Compute-intensive: build systems, ML training",
        "mixed_load": "Balanced: web server, database, dev tools",
        "io_intensive": "IO-dominant: file ops, background services",
    }
    try:
        processes = data_layer.load_preset(name)
        return {
            "preset": name,
            "description": descriptions.get(name, ""),
            "n_processes": len(processes),
            "processes": processes,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
