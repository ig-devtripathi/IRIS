import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Legend,
} from 'recharts';

const MF_DEFINITIONS = {
  waiting_time: {
    label: 'Waiting Time (ms)',
    universe: [0, 100],
    sets: {
      low:    { type: 'trimf', points: [0, 0, 40], color: '#3b82f6' },
      medium: { type: 'trimf', points: [20, 50, 80], color: '#8b5cf6' },
      high:   { type: 'trimf', points: [60, 100, 100], color: '#ef4444' },
    },
  },
  burst_estimate: {
    label: 'Burst Estimate (ms)',
    universe: [0, 100],
    sets: {
      short:  { type: 'trimf', points: [0, 0, 35], color: '#3b82f6' },
      medium: { type: 'trimf', points: [20, 50, 80], color: '#8b5cf6' },
      long:   { type: 'trimf', points: [65, 100, 100], color: '#ef4444' },
    },
  },
  priority: {
    label: 'Priority',
    universe: [0, 10],
    sets: {
      low:    { type: 'trimf', points: [0, 0, 4], color: '#3b82f6' },
      medium: { type: 'trimf', points: [3, 5, 7], color: '#8b5cf6' },
      high:   { type: 'trimf', points: [6, 10, 10], color: '#ef4444' },
    },
  },
  behavior_score: {
    label: 'Behavior Score',
    universe: [0, 1],
    aiOnly: true,
    sets: {
      io_bound:  { type: 'trimf', points: [0.0, 0.0, 0.4], color: '#3b82f6' },
      mixed:     { type: 'trimf', points: [0.3, 0.5, 0.7], color: '#8b5cf6' },
      cpu_bound: { type: 'trimf', points: [0.6, 1.0, 1.0], color: '#ef4444' },
    },
  },
  scheduling_score: {
    label: 'Scheduling Score (Output)',
    universe: [0, 10],
    sets: {
      very_low:  { type: 'trimf', points: [0, 0, 2.5], color: '#06b6d4' },
      low:       { type: 'trimf', points: [1.5, 3, 4.5], color: '#3b82f6' },
      medium:    { type: 'trimf', points: [3.5, 5, 6.5], color: '#8b5cf6' },
      high:      { type: 'trimf', points: [5.5, 7, 8.5], color: '#ef4444' },
      very_high: { type: 'trimf', points: [7.5, 10, 10], color: '#f59e0b' },
    },
  },
};

function generateTrimfPoints(points, universe, steps = 200) {
  const [a, b, c] = points;
  const [uMin, uMax] = universe;
  const data = [];
  const step = (uMax - uMin) / steps;

  for (let x = uMin; x <= uMax; x += step) {
    let y = 0;
    if (x <= a) y = 0;
    else if (x <= b) y = b === a ? 1 : (x - a) / (b - a);
    else if (x <= c) y = c === b ? 1 : (c - x) / (c - b);
    else y = 0;

    // Handle edge cases for shoulder MFs
    if (a === b && x <= a) y = 1;
    if (b === c && x >= c) y = 1;

    data.push({ x: parseFloat(x.toFixed(4)), y: Math.max(0, Math.min(1, y)) });
  }
  return data;
}

function MFChart({ variable, config, selectedProcessValue }) {
  const allData = useMemo(() => {
    const setNames = Object.keys(config.sets);
    const points = {};

    setNames.forEach((name) => {
      const mfData = generateTrimfPoints(config.sets[name].points, config.universe);
      mfData.forEach((pt) => {
        const key = pt.x;
        if (!points[key]) points[key] = { x: pt.x };
        points[key][name] = pt.y;
      });
    });

    return Object.values(points).sort((a, b) => a.x - b.x);
  }, [config]);

  return (
    <div className="rounded-lg bg-[#0a0a14] border border-[#1e1e3a] p-3">
      <p className="text-xs font-semibold text-[#94a3b8] mb-2">{config.label}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={allData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
          <XAxis
            dataKey="x"
            type="number"
            domain={config.universe}
            tick={{ fontSize: 10, fill: '#475569' }}
            tickCount={6}
            stroke="#1e1e3a"
          />
          <YAxis
            domain={[0, 1]}
            tick={{ fontSize: 10, fill: '#475569' }}
            tickCount={3}
            stroke="#1e1e3a"
            width={25}
          />
          {Object.entries(config.sets).map(([name, set]) => (
            <Line
              key={name}
              dataKey={name}
              type="linear"
              stroke={set.color}
              strokeWidth={2}
              dot={false}
              name={name}
            />
          ))}
          {selectedProcessValue !== undefined && selectedProcessValue !== null && (
            <ReferenceLine
              x={selectedProcessValue}
              stroke="#f1f5f9"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{ value: selectedProcessValue.toFixed(1), fill: '#f1f5f9', fontSize: 10, position: 'top' }}
            />
          )}
          <Tooltip
            contentStyle={{
              backgroundColor: '#161628',
              border: '1px solid #1e1e3a',
              borderRadius: '8px',
              fontSize: '11px',
              color: '#f1f5f9',
            }}
            formatter={(value, name) => [value.toFixed(3), name]}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="flex gap-3 mt-1 justify-center">
        {Object.entries(config.sets).map(([name, set]) => (
          <span key={name} className="flex items-center gap-1 text-[10px] text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: set.color }} />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function FuzzyExplorer({ processes, mode }) {
  const [selectedPid, setSelectedPid] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const isAi = mode === 'ai';

  const selectedProcess = processes.find((p) => p.pid === selectedPid);

  const getProcessValue = (variable) => {
    if (!selectedProcess) return null;
    const map = {
      waiting_time: selectedProcess.waiting_time,
      burst_estimate: selectedProcess.burst_time,
      priority: selectedProcess.priority,
      behavior_score: selectedProcess.behavior_score,
      scheduling_score: selectedProcess.scheduling_score,
    };
    return map[variable];
  };

  const variables = Object.entries(MF_DEFINITIONS).filter(
    ([key, config]) => !(config.aiOnly && !isAi)
  );

  return (
    <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-6 glow-primary">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)' }}>
        <div className="w-1 h-4 rounded-full bg-[#6366f1]" />
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#8b9bb4]">
          Fuzzy Inference Explorer
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* LEFT — MF Plots */}
        <div className="space-y-3">
          {variables.map(([key, config]) => (
            <MFChart
              key={key}
              variable={key}
              config={config}
              selectedProcessValue={getProcessValue(key)}
            />
          ))}
        </div>

        {/* RIGHT — Rule Firing Log */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#f1f5f9]">Rule Activation Log</h3>
          </div>

          {/* Custom Process selector */}
          <div className="relative mb-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="w-full px-3 py-2.5 rounded-lg bg-[#0a0a14] border border-[#1e1e3a] text-sm text-[#f1f5f9] flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
            >
              <span>
                {selectedProcess
                  ? `PID ${selectedProcess.pid} — ${selectedProcess.name} (Score: ${selectedProcess.scheduling_score.toFixed(1)})`
                  : 'Select process to inspect'}
              </span>
              <svg
                className={`w-4 h-4 text-[#94a3b8] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isOpen && (
              <div className="absolute top-full left-0 w-full mt-2 bg-[#0a0a14] border border-[#1e1e3a] rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedPid(null);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-[#94a3b8] hover:bg-[#161628] transition-colors border-b border-[#1e1e3a]/50"
                >
                  Select process to inspect
                </button>
                {processes.map((p) => (
                  <button
                    key={p.pid}
                    onClick={() => {
                      setSelectedPid(p.pid);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-[#161628] ${
                      selectedPid === p.pid ? 'text-[#6366f1] bg-[#161628]' : 'text-[#f1f5f9]'
                    }`}
                  >
                    PID {p.pid} — {p.name} (Score: {p.scheduling_score.toFixed(1)})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rule display */}
          {selectedProcess ? (
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              <p className="text-xs text-[#475569] mb-2">
                {selectedProcess.rule_log?.length || 0} rules fired for{' '}
                <span className="text-[#06b6d4] font-mono">{selectedProcess.name}</span>
              </p>
              {selectedProcess.rule_log?.map((rule, i) => (
                <RuleCard key={i} rule={rule} index={i} />
              ))}
              {selectedProcess.reasoning && (
                <div className="mt-3 px-3 py-2 rounded-lg bg-[#161628] border border-[#1e1e3a]">
                  <p className="text-xs text-[#475569] italic">{selectedProcess.reasoning}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[400px] text-center">
              <div className="text-4xl mb-3 opacity-30">∿</div>
              <p className="text-sm text-[#475569]">Select a process to inspect its fuzzy rule activations</p>
              <p className="text-xs text-[#475569]/60 mt-1">Reference lines will appear on MF charts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RuleCard({ rule, index }) {
  // Parse rule parts
  const ruleIdMatch = rule.match(/^(R\d+\w*):?\s*/);
  const ruleId = ruleIdMatch ? ruleIdMatch[1] : null;
  const ruleBody = ruleIdMatch ? rule.slice(ruleIdMatch[0].length) : rule;

  return (
    <div className="rounded-lg bg-[#0a0a14] border border-[#1e1e3a] px-3 py-2.5 transition-all duration-200 hover:border-[#2d2d5e]">
      <div className="flex items-start gap-2">
        {ruleId && (
          <span className="text-xs font-bold text-[#06b6d4] font-mono bg-[#06b6d4]/10 px-1.5 py-0.5 rounded">
            {ruleId}
          </span>
        )}
        <p className="font-mono text-xs text-[#94a3b8] leading-relaxed flex-1">
          {highlightRuleBody(ruleBody)}
        </p>
      </div>
      {/* Activation bar */}
      <div className="mt-1.5 w-full h-1 rounded-full bg-[#1e1e3a] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4]"
          style={{ width: `${60 + index * 10}%`, maxWidth: '100%' }}
        />
      </div>
    </div>
  );
}

function highlightRuleBody(body) {
  const parts = body.split(/(\[.*?\]|→)/g);
  return parts.map((seg, i) => {
    if (seg.startsWith('[') && seg.endsWith(']')) {
      return (
        <span key={i} className="text-[#6366f1] font-semibold">
          {seg}
        </span>
      );
    }
    if (seg === '→') {
      return (
        <span key={i} className="text-[#10b981] font-bold mx-1">
          →
        </span>
      );
    }
    return <span key={i}>{seg}</span>;
  });
}
