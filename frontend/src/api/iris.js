const API_BASE = '/api';

export async function runSimulation(params) {
  const body = {
    mode: params.mode,
    source: params.source,
    n_processes: params.nProcesses,
    time_quantum: params.timeQuantum,
    preset: params.preset || null
  };
  let res;
  try {
    res = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch {
    throw new Error('Backend is unreachable. Start the server with: uvicorn main:app --port 8000');
  }
  if (!res.ok) {
    try {
      const err = await res.json();
      throw new Error(err.detail || 'Simulation failed');
    } catch (e) {
      if (e.message && e.message !== 'Simulation failed') throw e;
      throw new Error(`Simulation failed (HTTP ${res.status})`);
    }
  }
  return res.json();
}

export async function getHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function getPreset(name) {
  const res = await fetch(`${API_BASE}/presets/${name}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail);
  }
  return res.json();
}
