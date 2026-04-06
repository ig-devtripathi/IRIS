import React, { useState, useEffect } from 'react';
import { runSimulation, getHealth } from './api/iris';
import Header from './components/Header';
import ControlPanel from './components/ControlPanel';
import StatusBadge from './components/StatusBadge';
import ProcessTable from './components/ProcessTable';
import FuzzyExplorer from './components/FuzzyExplorer';
import GanttPanel from './components/GanttPanel';
import MetricsPanel from './components/MetricsPanel';
import ResearchSummary from './components/ResearchSummary';

function ErrorBanner({ message, onDismiss }) {
  const isPsutilError = message?.includes('psutil returned 0');

  return (
    <div className="mb-6 rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/10 px-5 py-4 flex items-start justify-between transition-all duration-300">
      <div className="flex items-start gap-3">
        <span className="text-[#ef4444] text-lg mt-0.5">✕</span>
        <div>
          <p className="text-sm text-[#ef4444] font-medium">{message}</p>
          {isPsutilError && (
            <p className="text-xs text-[#f59e0b] mt-1 flex items-center gap-1">
              💡 Switch Data Source to <span className="font-semibold">Simulated</span> ↑
            </p>
          )}
        </div>
      </div>
      <button
        onClick={onDismiss}
        className="text-[#ef4444] hover:text-[#f87171] transition-colors text-sm px-2"
      >
        ✕
      </button>
    </div>
  );
}

function LoadingState() {
  const steps = [
    'Acquiring Processes...',
    'AI Classification...',
    'Fuzzy Inference...',
    'Running Simulations...',
    'Computing Metrics...',
  ];

  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-8">
      {/* Shimmer bar */}
      <div className="w-full h-2 rounded-full overflow-hidden mb-6 animate-shimmer" />

      {/* Pipeline steps */}
      <div className="flex items-center justify-center gap-3">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i <= activeStep
                  ? 'bg-[#6366f1] shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                  : 'bg-[#1e1e3a]'
              }`}
            />
            <span
              className={`text-xs transition-colors duration-300 ${
                i === activeStep
                  ? 'text-[#f1f5f9] font-medium'
                  : i < activeStep
                  ? 'text-[#6366f1]'
                  : 'text-[#475569]'
              }`}
            >
              {step}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`w-8 h-px transition-colors duration-300 ${
                  i < activeStep ? 'bg-[#6366f1]' : 'bg-[#1e1e3a]'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Spinner */}
      <div className="flex justify-center mt-6">
        <svg className="animate-spin h-6 w-6 text-[#6366f1]" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl font-bold mb-4">
        <span className="bg-gradient-to-r from-[#6366f1] to-[#06b6d4] bg-clip-text text-transparent">
          ⟨ IRIS ⟩
        </span>
      </div>
      <p className="text-[#94a3b8] text-lg mb-6">
        Configure your simulation above and click Run
      </p>
      <div className="flex items-center gap-3">
        {['Mamdani Fuzzy Logic', '3-Algorithm Comparison', "Jain's Fairness Index"].map((feat) => (
          <span
            key={feat}
            className="text-xs px-3 py-1.5 rounded-full bg-[#161628] border border-[#1e1e3a] text-[#94a3b8]"
          >
            {feat}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [controls, setControls] = useState({
    mode: 'pure',
    source: 'simulated',
    nProcesses: 10,
    timeQuantum: 4,
    preset: null,
  });

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

  // On mount: check health
  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runSimulation(controls);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-[#f1f5f9]">
      <Header health={health} data={data} />

      <main className="max-w-[1600px] mx-auto px-6 pb-16 pt-8">
        {/* Warning if fuzzy engine not initialized */}
        {health && health.services?.fuzzy_engine !== 'initialized' && (
          <div className="mb-6 rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-5 py-3 flex items-center gap-3">
            <span className="text-[#f59e0b]">⚠</span>
            <p className="text-sm text-[#f59e0b]">
              Fuzzy engine is not initialized. Some features may not work correctly.
            </p>
          </div>
        )}

        <ControlPanel
          controls={controls}
          setControls={setControls}
          onRun={handleRun}
          loading={loading}
        />

        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

        {loading && <LoadingState />}

        {data && !loading && (
          <>
            <StatusBadge activeAi={data.meta.active_ai} meta={data.meta} />
            <ProcessTable processes={data.processes} mode={data.meta.mode} />
            <FuzzyExplorer processes={data.processes} mode={data.meta.mode} />
            <GanttPanel results={data.results} timeQuantum={controls.timeQuantum} />
            <MetricsPanel metrics={data.metrics} />
            {data.research_summary && data.research_summary !== '' && (
              <ResearchSummary summary={data.research_summary} meta={data.meta} />
            )}
          </>
        )}

        {!data && !loading && <EmptyState />}
      </main>
    </div>
  );
}
