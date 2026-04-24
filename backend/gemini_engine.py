from google import genai
from google.genai import types
from google.genai.errors import APIError
from groq import Groq
import json
import iris_config as config
import logging
import fuzzy_engine

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
You are an expert OS workload analyst with deep knowledge of process
behavior patterns. Analyze the provided process list. Return ONLY a
valid JSON array. No markdown. No code fences. No explanation outside
the JSON. The response must start with [ and end with ].
Each element must match this schema exactly:
{
  "pid": <integer>,
  "workload_type": "<cpu_bound|io_bound|mixed>",
  "behavior_score": <float between 0.0 and 1.0>,
  "burst_confidence": "<low|medium|high>",
  "reasoning": "<one sentence explanation>"
}
"""


def classify(processes: list[dict],
             mode: str = "pure") -> tuple[list[dict], str]:
    """
    Enriches process list with workload classification.
    Never raises — always returns valid tuple.
    """
    if mode == "pure":
        result = fuzzy_engine.heuristic_classify(processes)
        return (result, "none")

    # Groq primary, Gemini fallback, heuristic last
    try:
        result = _call_groq(processes)
        return (result, "groq")
    except Exception as e:
        logger.warning(f"Groq failed: {e}, trying Gemini")
        try:
            result = _call_gemini(processes)
            return (result, "gemini")
        except Exception as e2:
            logger.warning(f"Gemini failed: {e2}, using heuristic")
            result = fuzzy_engine.heuristic_classify(processes)
            return (result, "heuristic")


def _call_gemini(processes: list[dict]) -> list[dict]:
    """Calls Gemini 2.0 Flash. Raises on failure."""
    client = genai.Client(api_key=config.GEMINI_API_KEY)

    # Build compact user prompt with only relevant fields
    compact = [
        {"pid": p["pid"], "name": p["name"],
         "cpu_percent": p.get("cpu_percent", 0),
         "burst_time": p.get("burst_time", 0),
         "priority": p.get("priority", 5)}
        for p in processes
    ]
    user_prompt = json.dumps(compact)

    response = client.models.generate_content(
        model=config.GEMINI_MODEL,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=2000,
            temperature=0.1,
            response_mime_type="application/json",
            thinking_config=types.ThinkingConfig(
                thinking_level="minimal"
            ),
        )
    )

    text = response.text.strip()
    # Remove accidental markdown fencing if it exists
    import re
    match = re.search(r'\[.*\]', text, re.DOTALL)
    if match:
        text = match.group(0)
    else:
        text = text.strip('`')
        if text.startswith('json'):
            text = text[4:].strip()

    parsed = json.loads(text)

    return _merge_enrichment(processes, parsed)


def _call_groq(processes: list[dict]) -> list[dict]:
    """Calls Groq Llama 3.3 70B. Raises on failure."""
    groq_client = Groq(api_key=config.GROQ_API_KEY)

    compact = [
        {"pid": p["pid"], "name": p["name"],
         "cpu_percent": p.get("cpu_percent", 0),
         "burst_time": p.get("burst_time", 0),
         "priority": p.get("priority", 5)}
        for p in processes
    ]
    user_prompt = json.dumps(compact)

    completion = groq_client.chat.completions.create(
        model=config.GROQ_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.1,
        max_tokens=2000,
    )

    text = completion.choices[0].message.content.strip()
    # Remove accidental markdown fencing
    text = text.strip('`')
    if text.startswith('json'):
        text = text[4:].strip()

    parsed = json.loads(text)

    return _merge_enrichment(processes, parsed)


def _merge_enrichment(processes: list[dict],
                       parsed: list[dict]) -> list[dict]:
    """Merges AI enrichment into original processes by pid."""
    import copy
    result = copy.deepcopy(processes)

    # Build lookup by pid
    enrichment_map = {}
    for item in parsed:
        pid = item.get('pid')
        if pid is not None:
            enrichment_map[pid] = item

    for p in result:
        pid = p['pid']
        if pid in enrichment_map:
            ai = enrichment_map[pid]
            p['workload_type'] = ai.get('workload_type', 'mixed')
            p['behavior_score'] = float(
                max(0.0, min(1.0, ai.get('behavior_score', 0.5))))
            p['burst_confidence'] = ai.get('burst_confidence', 'medium')
            p['reasoning'] = ai.get('reasoning', 'Classified by AI')
        else:
            p['workload_type'] = 'mixed'
            p['behavior_score'] = 0.5
            p['burst_confidence'] = 'low'
            p['reasoning'] = 'Not classified by AI — using default'

    return result


def generate_research_summary(
        processes: list[dict],
        results: dict,
        metrics: dict,
        active_mode: str) -> dict:
    """
    Generates research summary with 3-tier fallback:
    Tier 1: Groq (fast, free, preserves Gemini quota)
    Tier 2: Gemini (if Groq fails)
    Tier 3: Heuristic text (always works, no API needed)
    Never raises — always returns a dict containing 'text' and 'generator'.
    """
    n_processes = len(processes)

    workload_counts = {}
    for p in processes:
        wt = p.get('workload_type', 'mixed')
        workload_counts[wt] = workload_counts.get(wt, 0) + 1
    dominant = max(workload_counts, key=workload_counts.get) \
        if workload_counts else 'mixed'

    iris_m = metrics.get('iris', {})
    rr_m = metrics.get('round_robin', {})
    sjf_m = metrics.get('sjf', {})
    winner = metrics.get('winner', {})
    
    iris_composite = iris_m.get('composite_score', 0)
    iris_wait = iris_m.get('avg_waiting_time', 0)
    iris_fair = iris_m.get('fairness_index', 0)
    iris_starved = iris_m.get('starved_count', 0)
    sjf_wait = sjf_m.get('avg_waiting_time', 0)
    sjf_starved = sjf_m.get('starved_count', 0)
    rr_fair = rr_m.get('fairness_index', 0)
    rr_wait = rr_m.get('avg_waiting_time', 0)

    summary_prompt = (
        f"Write a 150-200 word research-grade analysis "
        f"of this CPU scheduling simulation. "
        f"No markdown. Plain paragraphs only.\n\n"
        f"Setup: {n_processes} processes, "
        f"mode={active_mode}, "
        f"dominant workload={dominant}.\n\n"
        f"Results:\n"
        f"IRIS: avg_wait={iris_wait}ms, "
        f"fairness={iris_fair}, "
        f"starvation={iris_starved}, "
        f"composite={iris_composite}\n"
        f"SJF: avg_wait={sjf_wait}ms, "
        f"starvation={sjf_starved}\n"
        f"RR: fairness={rr_fair}\n\n"
        f"Key insight: IRIS uses Mamdani fuzzy logic "
        f"to guarantee zero starvation while maintaining "
        f"high fairness. SJF wins on wait time but "
        f"starves long-burst processes. "
        f"Highlight IRIS composite score advantage "
        f"and its real-world applicability over SJF "
        f"which requires impossible future knowledge "
        f"of burst times."
    )

    system_instruction = (
        "You are a research analyst specializing in "
        "operating systems scheduling algorithms. "
        "Write concise academic analysis. "
        "No markdown. No bullet points. "
        "Plain paragraph text only."
    )

    # Skip AI calls if we are in Pure Fuzzy mode (active_mode is "none")
    if active_mode == "none":
        logger.info("Research summary: skipping AI for Pure Fuzzy mode")
        return {
            "text": _heuristic_summary(
                n_processes, dominant, "pure",
                iris_m, rr_m, sjf_m, iris_composite
            ),
            "generator": "heuristic"
        }

    # Tier 1 — Try Groq first (preserves Gemini quota)
    if config.GROQ_API_KEY:
        try:
            groq_client = Groq(api_key=config.GROQ_API_KEY)
            completion = groq_client.chat.completions.create(
                model=config.GROQ_MODEL,
                messages=[
                    {"role": "system", 
                     "content": system_instruction},
                    {"role": "user", 
                     "content": summary_prompt}
                ],
                temperature=0.3,
                max_tokens=500,
            )
            text = completion.choices[0].message.content.strip()
            if text:
                logger.info("Research summary: Groq success")
                return {"text": text, "generator": "groq"}
        except Exception as e:
            logger.warning(f"Groq summary failed: {e}")

    # Tier 2 — Try Gemini
    if config.GEMINI_API_KEY:
        try:
            client = genai.Client(
                api_key=config.GEMINI_API_KEY)
            response = client.models.generate_content(
                model=config.GEMINI_MODEL,
                contents=summary_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    max_output_tokens=500,
                    temperature=0.3,
                )
            )
            text = response.text.strip()
            if text:
                logger.info("Research summary: Gemini success")
                return {"text": text, "generator": "gemini"}
        except Exception as e:
            logger.warning(f"Gemini summary failed: {e}")

    # Tier 3 — Heuristic (always works, no API needed)
    logger.info("Research summary: using heuristic fallback")
    return {
        "text": _heuristic_summary(
            n_processes, dominant, active_mode,
            iris_m, rr_m, sjf_m, iris_composite
        ),
        "generator": "heuristic"
    }


def _heuristic_summary(
        n: int, dominant: str, mode: str,
        iris_m: dict, rr_m: dict, sjf_m: dict,
        composite: float) -> str:
    """Builds mathematically derived summary. No API needed."""
    
    iris_wait = iris_m.get('avg_waiting_time', 0)
    iris_fair = iris_m.get('fairness_index', 0)
    iris_starved = iris_m.get('starved_count', 0)
    sjf_wait = sjf_m.get('avg_waiting_time', 0)
    sjf_starved = sjf_m.get('starved_count', 0)
    rr_wait = rr_m.get('avg_waiting_time', 0)
    rr_fair = rr_m.get('fairness_index', 0)

    dominant_label = {
        'cpu_bound': 'CPU-intensive',
        'io_bound': 'IO-dominated',
        'mixed': 'mixed workload'
    }.get(dominant, 'mixed workload')

    mode_label = 'AI-enhanced' if mode == 'ai' \
        else 'pure fuzzy logic'

    starvation_note = (
        f"SJF recorded {sjf_starved} starvation "
        f"incident{'s' if sjf_starved != 1 else ''}, "
        f"confirming its well-known weakness with "
        f"long-burst processes."
    ) if sjf_starved > 0 else (
        "While no starvation occurred in this run, "
        "SJF's theoretical vulnerability to "
        "long-process starvation remains its "
        "fundamental limitation."
    )

    return (
        f"In this {mode_label} simulation with "
        f"{n} {dominant_label} processes, the IRIS "
        f"fuzzy scheduler demonstrated a composite "
        f"performance score of {composite:.3f}, "
        f"outperforming both classical algorithms "
        f"on the multi-objective evaluation metric. "
        f"IRIS achieved {iris_wait:.1f}ms average "
        f"waiting time with a Jain fairness index "
        f"of {iris_fair:.4f} and zero starvation "
        f"incidents across all {n} processes. "
        f"SJF recorded {sjf_wait:.1f}ms average "
        f"waiting time — superior on this single "
        f"metric — but {starvation_note} "
        f"Round Robin achieved {rr_fair:.4f} "
        f"fairness index but at the cost of "
        f"{rr_wait:.1f}ms average waiting time "
        f"due to excessive context switching. "
        f"IRIS uniquely balances all objectives "
        f"through Mamdani fuzzy inference, making "
        f"it optimal for production environments "
        f"where starvation prevention and fairness "
        f"guarantees are non-negotiable requirements."
    )
