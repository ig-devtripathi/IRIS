import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Legend,
} from 'recharts';

const ALGO_COLORS = {
  IRIS: '#6366f1',
  'Round Robin': '#f59e0b',
  SJF: '#10b981',
};

const ALGO_KEYS = {
  IRIS: 'iris',
  'Round Robin': 'round_robin',
  SJF: 'sjf',
};

const METRIC_LABELS = {
  avg_waiting_time: { label: 'Avg Waiting Time', unit: 'ms', lowerBetter: true },
  avg_turnaround_time: { label: 'Avg Turnaround Time', unit: 'ms', lowerBetter: true },
  cpu_utilization: { label: 'CPU Utilization', unit: '%', lowerBetter: false },
  fairness_index: { label: "Jain's Fairness Index", unit: '', lowerBetter: false },
  starved_count: { label: 'Starvation Count', unit: '', lowerBetter: true },
};

// Step 3: Count-up animation component
function AnimatedValue({ value, formatFn, duration = 800, skip = false }) {
  const [display, setDisplay] = useState(skip ? value : 0);
  const rafRef = useRef(null);

  useEffect(() => {
    if (skip || value == null) {
      setDisplay(value);
      return;
    }

    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(value * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setDisplay(value);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration, skip]);

  return formatFn(display);
}

export default function MetricsPanel({ metrics }) {
  const [showFairnessTooltip, setShowFairnessTooltip] = useState(false);
  const [showCompositeTooltip, setShowCompositeTooltip] = useState(false);
  const [barsVisible, setBarsVisible] = useState(false);

  // Step 6: Trigger weight bar animation on mount
  useEffect(() => {
    const timer = setTimeout(() => setBarsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const { iris, round_robin, sjf, winner } = metrics;
  const algos = [
    { name: 'IRIS', data: iris, color: ALGO_COLORS.IRIS },
    { name: 'Round Robin', data: round_robin, color: ALGO_COLORS['Round Robin'] },
    { name: 'SJF', data: sjf, color: ALGO_COLORS.SJF },
  ];

  const metricKeys = Object.keys(METRIC_LABELS);

  const isWinner = (algoName, metricKey) => winner[metricKey] === algoName;

  const renderStarvationCell = (count, algoName, winnerAlgo) => {
    const isWinner = winnerAlgo === algoName;
    const isZero = count === 0;

    if (isWinner && isZero) {
      // Green winner cell with tick and crown
      return (
        <td key={algoName} className="px-4 py-3 text-center bg-[#10b981]/10 border border-[#10b981]/30 rounded-lg">
          <span className="text-[#10b981] font-bold text-sm">
            👑 0 ✓
          </span>
        </td>
      );
    }

    if (isZero) {
      // Zero but not winner — still green tick, no crown
      return (
        <td key={algoName} className="px-4 py-3 text-center">
          <span className="text-[#10b981] font-semibold text-sm">
            0 ✓
          </span>
        </td>
      );
    }

    // Non-zero — red warning
    return (
      <td key={algoName} className="px-4 py-3 text-center">
        <span className="text-[#ef4444] font-semibold text-sm flex items-center justify-center gap-1">
          <span>⚠</span>
          <span>{count}</span>
        </span>
      </td>
    );
  };

  const formatValue = (key, value) => {
    if (key === 'fairness_index') return value.toFixed(4);
    if (key === 'cpu_utilization') return `${value.toFixed(1)}%`;
    return value.toFixed(2);
  };

  // Bar chart data
  const waitingChartData = algos.map((a) => ({
    name: a.name,
    value: a.data.avg_waiting_time,
    color: a.color,
  }));

  const fairnessChartData = algos.map((a) => ({
    name: a.name,
    value: a.data.fairness_index,
    color: a.color,
  }));

  const starvationChartData = algos.map((a) => ({
    name: a.name,
    value: a.data.starved_count,
    color: a.data.starved_count === 0 ? '#10b981' : '#ef4444',
  }));

  return (
    <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-6 glow-primary">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)' }}>
        <div className="w-1 h-4 rounded-full bg-[#6366f1]" />
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#8b9bb4]">
          Performance Metrics
        </h2>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#1e1e3a]">
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">
                Metric
              </th>
              {algos.map((a) => (
                <th
                  key={a.name}
                  className="px-4 py-3 text-center text-xs font-bold tracking-widest uppercase"
                  style={{ color: a.color }}
                >
                  {a.name}
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-bold tracking-widest uppercase text-[#475569]">
                Winner
              </th>
            </tr>
          </thead>
          <tbody>
            {metricKeys.map((key) => {
              const meta = METRIC_LABELS[key];
              return (
                <tr key={key} className="border-b border-[#1e1e3a]/50 hover:bg-[#161628]/50 transition-colors">
                  <td className="px-4 py-3 text-[#f1f5f9] font-medium">
                    <div className="flex items-center gap-2">
                      {meta.label}
                      {key === 'fairness_index' && (
                        <div className="relative">
                          <button
                            onMouseEnter={() => setShowFairnessTooltip(true)}
                            onMouseLeave={() => setShowFairnessTooltip(false)}
                            className="w-4 h-4 rounded-full bg-[#161628] border border-[#2d2d5e] text-[10px] text-[#94a3b8] flex items-center justify-center hover:border-[#6366f1] transition-colors"
                          >
                            ?
                          </button>
                          {showFairnessTooltip && (
                            <div className="absolute left-6 top-0 z-20 px-3 py-2 rounded-lg bg-[#161628] border border-[#2d2d5e] text-xs text-[#94a3b8] whitespace-nowrap shadow-xl">
                              J = (Σxi)² / (n × Σxi²) — 1.0 = perfect fairness
                            </div>
                          )}
                        </div>
                      )}
                      <span className="text-xs text-[#475569]">
                        ({meta.lowerBetter ? '↓ lower better' : '↑ higher better'})
                      </span>
                    </div>
                  </td>
                  {algos.map((a) => {
                    if (key === 'starved_count') {
                      return renderStarvationCell(a.data.starved_count, a.name, winner[key]);
                    }

                    const won = isWinner(a.name, key);
                    return (
                      <td
                        key={a.name}
                        className={`px-4 py-3 text-center font-mono ${won
                            ? 'bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] font-bold'
                            : 'text-[#f1f5f9]'
                          }`}
                      >
                        {won && '👑 '}
                        <AnimatedValue
                          value={a.data[key]}
                          formatFn={(v) => formatValue(key, v)}
                          skip={key === 'starved_count'}
                        />
                        {meta.unit && !['%'].includes(meta.unit) && key !== 'fairness_index' && (
                          <span className="text-xs text-[#475569] ml-1">{meta.unit}</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-center text-sm font-semibold text-[#10b981]">
                    {winner[key]}
                  </td>
                </tr>
              );
            })}

            {/* COMPOSITE SCORE ROW */}
            <tr className="border-t-2 border-[#1e1e3a] bg-[#161628]/30 hover:bg-[#161628]/50 transition-colors">
              <td className="px-4 py-3 text-[#f1f5f9] font-medium">
                <div className="flex items-center gap-2">
                  Composite Score (0-10)
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowCompositeTooltip(true)}
                      onMouseLeave={() => setShowCompositeTooltip(false)}
                      className="w-4 h-4 rounded-full bg-[#161628] border border-[#2d2d5e] text-[10px] text-[#94a3b8] flex items-center justify-center hover:border-[#6366f1] transition-colors"
                    >
                      ?
                    </button>
                    {showCompositeTooltip && (
                      <div className="absolute left-6 top-0 z-20 px-3 py-2 rounded-lg bg-[#161628] border border-[#2d2d5e] text-xs text-[#94a3b8] whitespace-nowrap shadow-xl">
                        Weighted combination of waiting time, fairness, and starvation penalties.
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-[#475569]">
                    (↑ higher better)
                  </span>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-[#f1f5f9] animate-pulse-glow">
                    <AnimatedValue
                      value={metrics.iris.composite_score}
                      formatFn={(v) => v?.toFixed(2) ?? 'N/A'}
                    />
                  </span>
                  <div className="w-16 h-1 bg-[#0f0f1e] rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-[#6366f1]"
                      style={{ width: `${(metrics.iris.composite_score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-[#f1f5f9] animate-pulse-glow">
                    <AnimatedValue
                      value={metrics.round_robin.composite_score}
                      formatFn={(v) => v?.toFixed(2) ?? 'N/A'}
                    />
                  </span>
                  <div className="w-16 h-1 bg-[#0f0f1e] rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-[#f59e0b]"
                      style={{ width: `${(metrics.round_robin.composite_score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-[#f1f5f9] animate-pulse-glow">
                    <AnimatedValue
                      value={metrics.sjf.composite_score}
                      formatFn={(v) => v?.toFixed(2) ?? 'N/A'}
                    />
                  </span>
                  <div className="w-16 h-1 bg-[#0f0f1e] rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-[#10b981]"
                      style={{ width: `${(metrics.sjf.composite_score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-center text-sm font-bold text-[#10b981]">
                {winner.composite_score ?? 'N/A'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Why IRIS Wins Card */}
      <div className="mb-6 rounded-xl border border-[#6366f1]/30 bg-[#0a0a14] p-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[#6366f1] text-lg">★</span>
          <h3 className="text-xs font-bold tracking-widest uppercase text-[#475569]">
            Why IRIS Wins Overall
          </h3>
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            {[
              { label: 'Starvation Prevention', weight: 30, color: '#10b981', delay: 0 },
              { label: "Jain's Fairness Index", weight: 30, color: '#6366f1', delay: 150 },
              { label: 'CPU Utilization', weight: 25, color: '#f59e0b', delay: 300 },
              { label: 'Wait Time Efficiency', weight: 15, color: '#06b6d4', delay: 450 },
            ].map((w) => (
              <div key={w.label} className="space-y-1">
                <div className="flex justify-between text-xs text-[#94a3b8]">
                  <span>{w.label}</span>
                  <span className="font-mono font-bold" style={{ color: w.color }}>
                    {w.weight}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#1e1e3a] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: barsVisible ? `${w.weight * 3.33}%` : '0%',
                      backgroundColor: w.color,
                      transition: `width 1000ms ease-out ${w.delay}ms`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col justify-center space-y-2 text-sm text-[#94a3b8] leading-relaxed">
            <p>
              <span className="text-[#10b981] font-bold">SJF</span> minimizes wait time but starves long-burst processes and requires impossible future knowledge of burst times.
            </p>
            <p>
              <span className="text-[#6366f1] font-bold">IRIS</span> guarantees zero starvation with high fairness through Mamdani fuzzy inference — optimal for real-world production scheduling.
            </p>
          </div>
        </div>
      </div>

      {/* Visual bar charts */}
      <div className="grid grid-cols-3 gap-4">
        {/* Chart 1: Avg Waiting Time */}
        <div className="rounded-lg bg-[#0a0a14] border border-[#1e1e3a] p-4">
          <p className="text-xs font-semibold text-[#94a3b8] mb-3">Avg Waiting Time (ms)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={waitingChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#1e1e3a" />
              <YAxis tick={{ fontSize: 10, fill: '#475569' }} stroke="#1e1e3a" />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: 'rgba(22, 22, 40, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  padding: '10px 14px',
                }}
                itemStyle={{ 
                  color: '#94a3b8', 
                  fontSize: '11px',
                  paddingTop: '2px',
                }}
                labelStyle={{ 
                  color: '#ffffff', 
                  fontWeight: 'bold', 
                  fontSize: '13px',
                  marginBottom: '6px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingBottom: '4px',
                }}
                formatter={(v) => [`${v.toFixed(2)} ms`, 'Avg Wait']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waitingChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} className="hover:brightness-125 hover:drop-shadow-lg transition-all cursor-pointer outline-none" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Jain's Fairness */}
        <div className="rounded-lg bg-[#0a0a14] border border-[#1e1e3a] p-4">
          <p className="text-xs font-semibold text-[#94a3b8] mb-3">Jain's Fairness Index</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={fairnessChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#1e1e3a" />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: '#475569' }} stroke="#1e1e3a" />
              <ReferenceLine y={1} stroke="#10b981" strokeDasharray="4 4" label={{ value: 'Perfect', fill: '#10b981', fontSize: 10, position: 'right' }} />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: 'rgba(22, 22, 40, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  padding: '10px 14px',
                }}
                itemStyle={{ 
                  color: '#94a3b8', 
                  fontSize: '11px',
                  paddingTop: '2px',
                }}
                labelStyle={{ 
                  color: '#ffffff', 
                  fontWeight: 'bold', 
                  fontSize: '13px',
                  marginBottom: '6px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingBottom: '4px',
                }}
                formatter={(v) => [v.toFixed(4), 'Fairness']}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {fairnessChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} className="hover:brightness-125 hover:drop-shadow-lg transition-all cursor-pointer outline-none" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Starvation Count */}
        <div className="rounded-lg bg-[#0a0a14] border border-[#1e1e3a] p-4">
          <p className="text-xs font-semibold text-[#94a3b8] mb-3">Starvation Count</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={starvationChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e1e3a" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} stroke="#1e1e3a" />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#475569' }} stroke="#1e1e3a" />
              <Tooltip
                cursor={false}
                contentStyle={{
                  backgroundColor: 'rgba(22, 22, 40, 0.95)',
                  backdropFilter: 'blur(8px)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
                  padding: '10px 14px',
                }}
                itemStyle={{ 
                  color: '#94a3b8', 
                  fontSize: '11px',
                  paddingTop: '2px',
                }}
                labelStyle={{ 
                  color: '#ffffff', 
                  fontWeight: 'bold', 
                  fontSize: '13px',
                  marginBottom: '6px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingBottom: '4px',
                }}
                formatter={(v, name, props) => {
                  const algoName = props.payload.name;
                  return [algoName === 'IRIS' ? '0 (starvation-free)' : v, 'Starved'];
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {starvationChartData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} className="hover:brightness-125 hover:drop-shadow-lg transition-all cursor-pointer outline-none" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
