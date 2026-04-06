import React from 'react';

export default function StatusBadge({ activeAi, meta }) {
  const configs = {
    gemini: {
      bg: 'bg-[#f59e0b]/10',
      border: 'border-[#f59e0b]/30',
      dot: 'bg-[#f59e0b]',
      ping: true,
      text: '✦ AI Enhanced — Gemini 3.1 Flash Lite',
      textColor: 'text-[#f59e0b]',
    },
    groq: {
      bg: 'bg-[#10b981]/10',
      border: 'border-[#10b981]/30',
      dot: 'bg-[#10b981]',
      ping: true,
      text: '⚡ AI Enhanced — Groq Llama 3.3 70B',
      textColor: 'text-[#10b981]',
    },
    heuristic: {
      bg: 'bg-[#f97316]/10',
      border: 'border-[#f97316]/30',
      dot: 'bg-[#f97316]',
      ping: false,
      text: '◈ Pure Fuzzy — Heuristic Classifier',
      textColor: 'text-[#f97316]',
    },
    none: {
      bg: 'bg-[#3b82f6]/10',
      border: 'border-[#3b82f6]/30',
      dot: 'bg-[#3b82f6]',
      ping: false,
      text: '∿ Pure Fuzzy Mode — No AI',
      textColor: 'text-[#3b82f6]',
    },
  };

  const cfg = configs[activeAi] || configs.none;

  return (
    <div
      className={`mb-6 rounded-xl border ${cfg.border} ${cfg.bg} px-5 py-3.5 flex items-center justify-between transition-all duration-300`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${cfg.dot}`} />
          {cfg.ping && (
            <div className={`absolute inset-0 w-3 h-3 rounded-full ${cfg.dot} animate-ping opacity-40`} />
          )}
        </div>
        <span className={`text-sm font-semibold ${cfg.textColor}`}>{cfg.text}</span>
      </div>

      {/* Meta chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2.5 py-1 rounded-full bg-[#161628] border border-[#1e1e3a] text-[#94a3b8] font-mono">
          {meta.n_processes} processes
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-[#161628] border border-[#1e1e3a] text-[#94a3b8] font-mono">
          quantum: {meta.time_quantum}ms
        </span>
        <span className="text-xs px-2.5 py-1 rounded-full bg-[#161628] border border-[#1e1e3a] text-[#94a3b8] font-mono">
          source: {meta.source}
        </span>
      </div>
    </div>
  );
}
