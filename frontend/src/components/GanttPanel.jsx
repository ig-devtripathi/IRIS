import React, { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid,
} from 'recharts';

function GanttChart({ title, ganttData, maxEnd, badge }) {
  // Transform gantt entries into row-based data for horizontal bars
  // Group by PID to collect all slices for each process
  const { rows, segments } = useMemo(() => {
    const pidOrder = [];
    const pidMap = {};

    ganttData.forEach((entry) => {
      if (!pidMap[entry.pid]) {
        pidMap[entry.pid] = { pid: entry.pid, name: entry.name, segments: [] };
        pidOrder.push(entry.pid);
      }
      pidMap[entry.pid].segments.push(entry);
    });

    const rows = pidOrder.map((pid) => pidMap[pid]);
    return { rows, segments: ganttData };
  }, [ganttData]);

  return (
    <div className="rounded-lg border border-[#1e1e3a] bg-[#0a0a14] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#f1f5f9]">{title}</h3>
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full border border-[#10b981]/30 text-[#10b981] bg-[#10b981]/10">
            {badge}
          </span>
        )}
      </div>

      <div className="relative overflow-x-auto">
        {/* Custom Gantt using SVG */}
        <GanttSVG rows={rows} maxEnd={maxEnd} />
      </div>
    </div>
  );
}

function GanttSVG({ rows, maxEnd }) {
  const rowHeight = 28;
  const labelWidth = 90;
  const chartWidth = 700;
  const totalWidth = labelWidth + chartWidth;
  const totalHeight = rows.length * rowHeight + 30; // +30 for x-axis
  const scale = chartWidth / maxEnd;

  // Generate x-axis ticks
  const tickCount = Math.min(10, Math.ceil(maxEnd / 50));
  const tickStep = Math.ceil(maxEnd / tickCount);
  const ticks = [];
  for (let t = 0; t <= maxEnd; t += tickStep) {
    ticks.push(t);
  }

  return (
    <svg width="100%" viewBox={`0 0 ${totalWidth} ${totalHeight}`} className="font-mono">
      {/* Grid lines */}
      {ticks.map((t) => (
        <line
          key={t}
          x1={labelWidth + t * scale}
          y1={0}
          x2={labelWidth + t * scale}
          y2={rows.length * rowHeight}
          stroke="#1e1e3a"
          strokeDasharray="2 4"
        />
      ))}

      {/* Rows */}
      {rows.map((row, rowIdx) => (
        <g key={row.pid}>
          {/* Row background on hover (removed bluish effect as requested) */}
          <rect
            x={0}
            y={rowIdx * rowHeight}
            width={totalWidth}
            height={rowHeight}
            fill="transparent"
          />

          {/* Label */}
          <text
            x={labelWidth - 8}
            y={rowIdx * rowHeight + rowHeight / 2 + 4}
            textAnchor="end"
            fill="#94a3b8"
            fontSize={9}
          >
            {row.name.length > 10 ? row.name.slice(0, 9) + '…' : row.name}
          </text>

          {/* Segments */}
          {row.segments.map((seg, segIdx) => {
            const x = labelWidth + seg.start * scale;
            const w = Math.max((seg.end - seg.start) * scale, 3); // min 3px width
            return (
              <g key={segIdx}>
                <rect
                  x={x}
                  y={rowIdx * rowHeight + 3}
                  width={w}
                  height={rowHeight - 6}
                  fill={seg.color}
                  rx={3}
                  ry={3}
                  opacity={0.85}
                  className="hover:opacity-100 hover:brightness-125 hover:drop-shadow-lg transition-all cursor-pointer"
                >
                  <title>
                    PID {seg.pid} — {seg.name}: {seg.start.toFixed(1)}ms → {seg.end.toFixed(1)}ms
                    {'\n'}Duration: {(seg.end - seg.start).toFixed(1)}ms
                  </title>
                </rect>
                {/* Show PID label if bar is wide enough */}
                {w > 25 && (
                  <text
                    x={x + w / 2}
                    y={rowIdx * rowHeight + rowHeight / 2 + 3}
                    textAnchor="middle"
                    fill="white"
                    fontSize={8}
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {seg.pid}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}

      {/* X-axis */}
      <line
        x1={labelWidth}
        y1={rows.length * rowHeight}
        x2={totalWidth}
        y2={rows.length * rowHeight}
        stroke="#1e1e3a"
      />
      {ticks.map((t) => (
        <text
          key={t}
          x={labelWidth + t * scale}
          y={rows.length * rowHeight + 18}
          textAnchor="middle"
          fill="#475569"
          fontSize={9}
        >
          {t}ms
        </text>
      ))}
    </svg>
  );
}

export default function GanttPanel({ results, timeQuantum }) {
  const { iris, round_robin, sjf } = results;

  // Compute shared max end time (RULE 9)
  const maxEnd = useMemo(() => {
    const allEnds = [
      ...iris.gantt.map((e) => e.end),
      ...round_robin.gantt.map((e) => e.end),
      ...sjf.gantt.map((e) => e.end),
    ];
    return Math.ceil(Math.max(...allEnds));
  }, [iris, round_robin, sjf]);

  return (
    <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-6 glow-primary">
      {/* Section Label */}
      <div className="flex items-center gap-2 mb-5 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)' }}>
        <div className="w-1 h-4 rounded-full bg-[#6366f1]" />
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#8b9bb4]">
          Scheduling Timeline Comparison
        </h2>
        <span className="text-xs text-[#475569] ml-2">
          Shared scale: 0 – {maxEnd}ms
        </span>
      </div>

      <div className="space-y-4">
        <GanttChart
          title="IRIS — Fuzzy Scheduler"
          ganttData={iris.gantt}
          maxEnd={maxEnd}
          badge="✓ Starvation-Free"
        />
        <GanttChart
          title={`Round Robin (Quantum: ${timeQuantum}ms)`}
          ganttData={round_robin.gantt}
          maxEnd={maxEnd}
        />
        <GanttChart
          title="SJF — Shortest Job First"
          ganttData={sjf.gantt}
          maxEnd={maxEnd}
        />
      </div>
    </div>
  );
}
