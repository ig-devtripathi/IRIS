import React from 'react';

export default function Header({ health, data }) {
  const isBackendUp = health?.services?.fuzzy_engine === 'initialized';

  const formatTime = (timestamp) => {
    if (!timestamp) return null;
    const d = new Date(timestamp);
    return d.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#0f0f1e]/80 backdrop-blur-md relative border-b border-[#1e1e3a]">
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-[#6366f1] via-[#06b6d4] to-transparent" />
      <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left — Logo + Subtitle */}
        <div className="flex flex-col">
          <h1 className="text-xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">
              ⟨ IRIS ⟩
            </span>
          </h1>
          <p className="text-xs text-[#475569] tracking-widest uppercase mt-0.5">
            Intelligent Resource Inference Scheduler
          </p>
        </div>

        {/* Right — Status indicators */}
        <div className="flex items-center gap-5">
          {/* Backend status */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className={`w-2.5 h-2.5 rounded-full ${isBackendUp ? 'bg-[#10b981]' : 'bg-[#ef4444]'}`} />
              {isBackendUp && (
                <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#10b981] animate-ping opacity-40" />
              )}
            </div>
            <span className="text-xs text-[#94a3b8]">Backend</span>
          </div>

          {/* Version pill */}
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#161628] border border-[#1e1e3a] text-[#94a3b8] font-mono">
            v1.0.0
          </span>

          {/* Last run timestamp */}
          {data?.meta?.timestamp && (
            <span className="text-xs text-[#475569] font-mono">
              Last run: {formatTime(data.meta.timestamp)}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
