import React from 'react';

export default function ControlPanel({ controls, setControls, onRun, loading }) {
  const isPresetActive = controls.preset !== null;

  const presets = [
    {
      key: 'heavy_cpu',
      icon: '⚡',
      label: 'Heavy CPU',
      desc: 'Compilers · ML Training · Build Systems',
      ring: 'ring-[#ef4444]',
      activeBg: 'bg-[#ef4444]/10',
    },
    {
      key: 'mixed_load',
      icon: '⚖️',
      label: 'Mixed Load',
      desc: 'Web Server · Database · Dev Tools',
      ring: 'ring-[#f59e0b]',
      activeBg: 'bg-[#f59e0b]/10',
    },
    {
      key: 'io_intensive',
      icon: '💾',
      label: 'IO Intensive',
      desc: 'File Ops · Background Services',
      ring: 'ring-[#10b981]',
      activeBg: 'bg-[#10b981]/10',
    },
  ];

  return (
    <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-6 glow-primary">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)' }}>
        <div className="w-1 h-4 rounded-full bg-[#6366f1]" />
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#8b9bb4]">
          Simulation Controls
        </h2>
      </div>

      {/* ROW 1 — Primary Toggles */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* AI Enhancement Toggle */}
        <div className="rounded-lg border border-[#1e1e3a] bg-[#080810] p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-[#f1f5f9]">AI Enhancement</label>
            <span className="text-xs text-[#475569]">
              {controls.mode === 'pure' ? 'OFF = Pure Fuzzy Logic only' : 'ON = Gemini/Groq classification'}
            </span>
          </div>
          <div className="flex rounded-lg bg-[#161628] p-1">
            <button
              onClick={() => setControls({ ...controls, mode: 'pure' })}
              disabled={isPresetActive ? false : false}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                controls.mode === 'pure'
                  ? 'bg-[#3b82f6] text-white shadow-[0_0_12px_rgba(59,130,246,0.4)] scale-[1.02]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
            >
              <span>≈</span> Pure Fuzzy
            </button>
            <button
              onClick={() => setControls({ ...controls, mode: 'ai' })}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                controls.mode === 'ai'
                  ? 'bg-[#10b981] text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] scale-[1.02]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
            >
              <span>✦</span> AI Enhanced
            </button>
          </div>
        </div>

        {/* Data Source Toggle */}
        <div className="rounded-lg border border-[#1e1e3a] bg-[#080810] p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-[#f1f5f9]">Data Source</label>
            <span className="text-xs text-[#475569]">
              {isPresetActive ? 'Preset overrides source toggle' : 'Live reads your actual OS processes'}
            </span>
          </div>
          <div className={`flex rounded-lg bg-[#161628] p-1 ${isPresetActive ? 'opacity-50 pointer-events-none' : ''}`}>
            <button
              onClick={() => setControls({ ...controls, source: 'simulated' })}
              disabled={isPresetActive}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                controls.source === 'simulated'
                  ? 'bg-[#8b5cf6] text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] scale-[1.02]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
            >
              Simulated <span className="text-xs opacity-60">PID 1001+</span>
            </button>
            <button
              onClick={() => setControls({ ...controls, source: 'live' })}
              disabled={isPresetActive}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                controls.source === 'live'
                  ? 'bg-[#06b6d4] text-white shadow-[0_0_12px_rgba(6,182,212,0.4)] scale-[1.02]'
                  : 'text-[#94a3b8] hover:text-[#f1f5f9]'
              }`}
            >
              <span className="relative flex items-center gap-1">
                {controls.source === 'live' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
                Live System
              </span>
              <span className="text-xs opacity-60">Real PIDs</span>
            </button>
          </div>
        </div>
      </div>

      {/* ROW 2 — Preset Scenarios */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)' }}>
          <label className="text-xs font-bold tracking-widest uppercase text-[#8b9bb4]">
            Preset Workload Scenarios
          </label>
          {isPresetActive && (
            <button
              onClick={() => setControls({ ...controls, preset: null })}
              className="text-xs text-[#ef4444] hover:text-[#f87171] transition-colors flex items-center gap-1"
            >
              ✕ Clear preset
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() =>
                setControls({ ...controls, preset: p.key, source: 'simulated' })
              }
              className={`rounded-lg border p-4 text-left transition-all duration-200 hover:scale-[1.01] ${
                controls.preset === p.key
                  ? `${p.activeBg} ring-2 ${p.ring} border-transparent`
                  : 'border-[#1e1e3a] bg-[#080810] hover:border-[#2d2d5e]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{p.icon}</span>
                <span className="text-sm font-semibold text-[#f1f5f9]">{p.label}</span>
              </div>
              <p className="text-xs text-[#475569]">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* ROW 3 — Sliders (only when no preset) */}
      {!isPresetActive && (
        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Process Count */}
          <div className="rounded-lg border border-[#1e1e3a] bg-[#080810] p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[#f1f5f9]">Process Count</label>
              <span className="text-2xl font-bold font-mono text-[#6366f1]">
                {controls.nProcesses}
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="30"
              step="1"
              value={controls.nProcesses}
              onChange={(e) =>
                setControls({ ...controls, nProcesses: parseInt(e.target.value) })
              }
              className="w-full accent-[#6366f1]"
              style={{
                background: `linear-gradient(to right, #6366f1 ${((controls.nProcesses - 5) / 25) * 100}%, #1e1e3a ${((controls.nProcesses - 5) / 25) * 100}%)`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[#475569]">5</span>
              <span className="text-xs text-[#475569]">30</span>
            </div>
          </div>

          {/* Time Quantum */}
          <div className="rounded-lg border border-[#1e1e3a] bg-[#080810] p-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-[#f1f5f9]">
                Time Quantum (Round Robin)
              </label>
              <span className="text-2xl font-bold font-mono text-[#f59e0b]">
                {controls.timeQuantum}
                <span className="text-sm font-normal text-[#475569] ml-1">ms</span>
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={controls.timeQuantum}
              onChange={(e) =>
                setControls({ ...controls, timeQuantum: parseInt(e.target.value) })
              }
              className="w-full accent-[#f59e0b]"
              style={{
                background: `linear-gradient(to right, #f59e0b ${((controls.timeQuantum - 1) / 19) * 100}%, #1e1e3a ${((controls.timeQuantum - 1) / 19) * 100}%)`,
              }}
            />
            <div className="flex justify-between mt-1">
              <span className="text-xs text-[#475569]">1ms</span>
              <span className="text-xs text-[#475569]">20ms</span>
            </div>
          </div>
        </div>
      )}

      {/* ROW 4 — Run Button */}
      <button
        onClick={onRun}
        disabled={loading}
        className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-3 ${
          loading
            ? 'bg-[#6366f1]/50 cursor-not-allowed opacity-70'
            : 'btn-run-animated text-white glow-primary-strong cursor-pointer hover:scale-[1.01]'
        }`}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Running Pipeline...
          </>
        ) : (
          <>▶ Run Simulation</>
        )}
      </button>
    </div>
  );
}
