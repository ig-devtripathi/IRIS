import React, { useState, useMemo } from 'react';

export default function ProcessTable({ processes, mode }) {
  const [expandedPid, setExpandedPid] = useState(null);
  const [sortAsc, setSortAsc] = useState(false);

  const isAi = mode === 'ai';

  const sorted = useMemo(() => {
    return [...processes].sort((a, b) =>
      sortAsc
        ? a.scheduling_score - b.scheduling_score
        : b.scheduling_score - a.scheduling_score
    );
  }, [processes, sortAsc]);

  const getPriorityBadge = (p) => {
    if (p >= 8) return { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', border: 'border-[#ef4444]/30' };
    if (p >= 5) return { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', border: 'border-[#f59e0b]/30' };
    return { bg: 'bg-[#475569]/15', text: 'text-[#94a3b8]', border: 'border-[#475569]/30' };
  };

  const getWorkloadBadge = (type) => {
    const map = {
      cpu_bound: { label: 'CPU', bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', border: 'border-[#ef4444]/30' },
      io_bound: { label: 'IO', bg: 'bg-[#3b82f6]/15', text: 'text-[#3b82f6]', border: 'border-[#3b82f6]/30' },
      mixed: { label: 'Mixed', bg: 'bg-[#8b5cf6]/15', text: 'text-[#8b5cf6]', border: 'border-[#8b5cf6]/30' },
    };
    return map[type] || { label: '—', bg: 'bg-[#475569]/10', text: 'text-[#475569]', border: 'border-[#475569]/20' };
  };

  const getScoreColor = (score) => {
    if (score > 6) return 'text-[#10b981]';
    if (score >= 3) return 'text-[#f59e0b]';
    return 'text-[#ef4444]';
  };

  const getBehaviorColor = (score) => {
    if (score >= 0.7) return '#ef4444';
    if (score >= 0.4) return '#8b5cf6';
    return '#3b82f6';
  };

  return (
    <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] shadow-xl overflow-visible glow-primary">
      {/* Section Label */}
      <div className="flex items-center gap-2 px-3 py-2 mx-6 mt-5 mb-3 rounded-lg" style={{ background: 'linear-gradient(90deg, rgba(99,102,241,0.05), transparent)' }}>
        <div className="w-1 h-4 rounded-full bg-[#6366f1]" />
        <h2 className="text-xs font-bold tracking-widest uppercase text-[#8b9bb4]">
          Process Intelligence
        </h2>
      </div>

      {/* Table */}
      <div className="overflow-x-visible max-h-[500px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#161628] border-b border-[#1e1e3a]">
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">PID</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">Name</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">Burst (ms)</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">CPU %</th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">Workload</th>
              {isAi && (
                <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">Behavior ▲</th>
              )}
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">
                <button
                  onClick={() => setSortAsc(!sortAsc)}
                  className="flex items-center gap-1 hover:text-[#f1f5f9] transition-colors"
                >
                  Score {sortAsc ? '↑' : '↓'}
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-bold tracking-widest uppercase text-[#475569]">Rules</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((proc, i) => {
              const prioBadge = getPriorityBadge(proc.priority);
              const workBadge = getWorkloadBadge(proc.workload_type);
              const isExpanded = expandedPid === proc.pid;

              return (
                <React.Fragment key={proc.pid}>
                  <tr
                    onClick={() => setExpandedPid(isExpanded ? null : proc.pid)}
                    className={`border-b border-[#1e1e3a]/50 cursor-pointer transition-all duration-200 hover:border-l-[2px] hover:border-l-[#6366f1] animate-fadeIn opacity-0 ${
                      isExpanded ? 'bg-[#161628] border-l-[2px] border-l-[#6366f1]' : 'hover:bg-[#161628]/50 border-l-[2px] border-l-transparent'
                    }`}
                    style={{ animationDelay: `${i * 0.05}s`, animationFillMode: 'forwards' }}
                  >
                    <td className="px-4 py-3 font-mono text-[#06b6d4] text-xs">{proc.pid}</td>
                    <td className="px-4 py-3 text-[#f1f5f9] font-medium">{proc.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#f1f5f9]">{proc.burst_time.toFixed(1)}</span>
                        <div className="w-16 h-1.5 rounded-full bg-[#1e1e3a] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#6366f1]"
                            style={{ width: `${Math.min(proc.burst_time, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${prioBadge.bg} ${prioBadge.text} ${prioBadge.border}`}
                      >
                        {proc.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#94a3b8]">{proc.cpu_percent.toFixed(1)}</span>
                        <div className="w-12 h-1.5 rounded-full bg-[#1e1e3a] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#06b6d4]"
                            style={{ width: `${Math.min(proc.cpu_percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {isAi ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${workBadge.bg} ${workBadge.text} ${workBadge.border}`}>
                          {workBadge.label}
                        </span>
                      ) : (
                        <span className="text-[#475569] font-mono text-xs">
                          —
                        </span>
                      )}
                    </td>
                    {isAi && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs" style={{ color: getBehaviorColor(proc.behavior_score) }}>
                            {proc.behavior_score.toFixed(2)}
                          </span>
                          <div className="w-14 h-1.5 rounded-full bg-[#1e1e3a] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${proc.behavior_score * 100}%`,
                                background: `linear-gradient(to right, #3b82f6, #8b5cf6, #ef4444)`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`text-lg font-bold font-mono ${getScoreColor(proc.scheduling_score)}`}>
                        {proc.scheduling_score.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-[#6366f1]/10 text-[#6366f1] border border-[#6366f1]/20 cursor-pointer hover:bg-[#6366f1]/20 transition-colors">
                        {proc.rule_log?.length || 0} rules
                      </span>
                    </td>
                  </tr>
                  {/* Expanded rule_log */}
                  {isExpanded && proc.rule_log && (
                    <tr className="bg-[#0a0a14]">
                      <td colSpan={isAi ? 9 : 8} className="px-6 py-4">
                        <div className="space-y-2">
                          <p className="text-xs font-bold tracking-widest uppercase text-[#475569] mb-2">
                            Fired Rules — PID {proc.pid}
                          </p>
                          {proc.rule_log.map((rule, i) => (
                            <div
                              key={i}
                              className="font-mono text-xs px-3 py-2 rounded-lg bg-[#161628] border border-[#1e1e3a] text-[#94a3b8]"
                            >
                              {highlightRule(rule)}
                            </div>
                          ))}
                          {proc.reasoning && (
                            <p className="text-xs text-[#475569] mt-2 italic">
                              {proc.reasoning}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-[#1e1e3a] flex items-center justify-between">
        <span className="text-xs text-[#475569]">
          Sorted by Scheduling Score {sortAsc ? '↑' : '↓'}
        </span>
        <span className="text-xs text-[#475569]">{processes.length} processes total</span>
      </div>
    </div>
  );
}

function highlightRule(rule) {
  // Parse rule: "R01: waiting_time[high] & priority[high] → very_high"
  const parts = [];
  let remaining = rule;

  // Highlight Rule ID
  const ruleIdMatch = remaining.match(/^(R\d+\w*:?)/);
  if (ruleIdMatch) {
    parts.push(
      <span key="id" className="text-[#06b6d4] font-bold">
        {ruleIdMatch[1]}
      </span>
    );
    remaining = remaining.slice(ruleIdMatch[1].length);
  }

  // Highlight linguistic terms in brackets
  const segments = remaining.split(/(\[.*?\]|→)/g);
  segments.forEach((seg, i) => {
    if (seg.startsWith('[') && seg.endsWith(']')) {
      parts.push(
        <span key={i} className="text-[#6366f1] font-semibold">
          {seg}
        </span>
      );
    } else if (seg === '→') {
      parts.push(
        <span key={i} className="text-[#10b981] font-bold mx-1">
          →
        </span>
      );
    } else {
      parts.push(
        <span key={i} className="text-[#94a3b8]">
          {seg}
        </span>
      );
    }
  });

  return <>{parts}</>;
}
