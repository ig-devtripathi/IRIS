import React, { useState, useEffect, useRef } from 'react';
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

function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  const statusMessages = [
    'Initializing fuzzy engine...',
    'Loading inference rules...',
    'Connecting to backend...',
    'Ready',
  ];

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => {
        setFadeOut(true);
        setTimeout(onComplete, 500);
      }, 2200),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, #0d0d1e 0%, #080810 70%)',
        animation: fadeOut ? 'splashFadeOut 0.5s ease-out forwards' : undefined,
      }}
    >
      {/* Pulsing ring behind logo */}
      <div className="absolute" style={{ width: 180, height: 180 }}>
        <div
          className="absolute inset-0 rounded-full border border-[#6366f1]/20"
          style={{ animation: 'splashRingPulse 2s ease-in-out infinite' }}
        />
        <div
          className="absolute inset-0 rounded-full border border-[#6366f1]/10"
          style={{ animation: 'splashRingPulse 2s ease-in-out 0.5s infinite' }}
        />
      </div>

      {/* Floating particles */}
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#6366f1]/40"
          style={{
            left: `${30 + i * 8}%`,
            top: '55%',
            animation: `splashParticle ${1.5 + i * 0.3}s ease-out ${i * 0.2}s infinite`,
          }}
        />
      ))}

      {/* Logo */}
      <div
        className="text-5xl font-black mb-2 relative z-10"
        style={{ animation: 'splashLogoIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
      >
        <span className="bg-gradient-to-r from-[#6366f1] via-[#8b5cf6] to-[#06b6d4] bg-clip-text text-transparent">
          ⟨ IRIS ⟩
        </span>
      </div>

      {/* Subtitle */}
      <p
        className="text-[10px] font-bold tracking-[0.35em] uppercase text-[#475569] mb-8 opacity-0"
        style={{ animation: 'splashSubtitleIn 0.6s ease-out 0.4s forwards' }}
      >
        Intelligent Resource Inference Scheduler
      </p>

      {/* Progress bar */}
      <div className="w-48 h-[2px] bg-[#1e1e3a] rounded-full overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#6366f1] to-[#06b6d4]"
          style={{ animation: 'splashBarFill 2s ease-in-out forwards' }}
        />
      </div>

      {/* Status text */}
      <p className="text-xs text-[#475569] h-4 transition-all duration-300">
        {statusMessages[phase] || statusMessages[0]}
      </p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen text-[#f1f5f9]">
      {/* Header skeleton */}
      <div className="border-b border-[#1e1e3a] bg-[#0a0a14]/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="animate-shimmer rounded h-6 w-20" />
          <div className="animate-shimmer rounded h-3 w-52" />
        </div>
        <div className="flex items-center gap-3">
          <div className="animate-shimmer rounded-full h-5 w-20" />
          <div className="animate-shimmer rounded h-4 w-14" />
        </div>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 pb-16 pt-8">
        {/* Control Panel skeleton */}
        <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-6">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-4 rounded-full bg-[#1e1e3a]" />
            <div className="animate-shimmer rounded h-3 w-36" />
          </div>
          {/* Mode + Source toggles */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="rounded-lg border border-[#1e1e3a] bg-[#0a0a14] p-4">
              <div className="flex justify-between mb-3">
                <div className="animate-shimmer rounded h-4 w-28" />
                <div className="animate-shimmer rounded h-3 w-32" />
              </div>
              <div className="flex gap-2">
                <div className="animate-shimmer rounded-lg h-9 flex-1" />
                <div className="animate-shimmer rounded-lg h-9 flex-1" />
              </div>
            </div>
            <div className="rounded-lg border border-[#1e1e3a] bg-[#0a0a14] p-4">
              <div className="flex justify-between mb-3">
                <div className="animate-shimmer rounded h-4 w-24" />
                <div className="animate-shimmer rounded h-3 w-40" />
              </div>
              <div className="flex gap-2">
                <div className="animate-shimmer rounded-lg h-9 flex-1" />
                <div className="animate-shimmer rounded-lg h-9 flex-1" />
              </div>
            </div>
          </div>
          {/* Presets */}
          <div className="animate-shimmer rounded h-3 w-44 mb-3" />
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer rounded-xl h-[72px]" />
            ))}
          </div>
          {/* Sliders */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            {[1, 2].map((n) => (
              <div key={n} className="rounded-lg border border-[#1e1e3a] bg-[#0a0a14] p-4">
                <div className="flex justify-between mb-3">
                  <div className="animate-shimmer rounded h-4 w-28" />
                  <div className="animate-shimmer rounded h-5 w-10" />
                </div>
                <div className="animate-shimmer rounded-full h-1.5 w-full" />
              </div>
            ))}
          </div>
          {/* Run button */}
          <div className="animate-shimmer rounded-xl h-12 w-full" />
        </div>

        {/* Empty state skeleton */}
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-shimmer rounded h-12 w-36 mb-4" />
          <div className="animate-shimmer rounded h-5 w-72 mb-6" />
          <div className="flex gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="animate-shimmer rounded-full h-7 w-40" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Toast({ visible, message }) {
  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl border shadow-2xl backdrop-blur-sm transition-all duration-500 ease-out ${
        visible
          ? 'translate-x-0 opacity-100 border-[#10b981]/30 bg-[#0f0f1e]/95'
          : 'translate-x-[120%] opacity-0 border-transparent bg-transparent'
      }`}
      style={{ pointerEvents: visible ? 'auto' : 'none' }}
    >
      <div className="w-6 h-6 rounded-full bg-[#10b981]/20 flex items-center justify-center flex-shrink-0">
        <span className="text-[#10b981] text-sm font-bold">✓</span>
      </div>
      <span className="text-sm text-[#f1f5f9] font-medium">{message}</span>
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
    <>
      {/* Pipeline stepper */}
      <div className="mb-6 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-8">
        <div className="w-full h-2 rounded-full overflow-hidden mb-6 animate-shimmer" />
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
      </div>

      {/* Skeleton: StatusBadge — horizontal pill */}
      <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-5 flex items-center gap-4">
        <div className="h-7 w-44 rounded-full animate-shimmer" />
        <div className="h-5 w-24 rounded-full animate-shimmer" />
      </div>

      {/* Skeleton: ProcessTable — header + 8 rows */}
      <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] overflow-hidden">
        <div className="bg-[#161628] border-b border-[#1e1e3a] px-4 py-3.5 flex gap-6">
          {[36, 80, 56, 44, 44, 52, 56, 48].map((w, i) => (
            <div key={i} className="animate-shimmer rounded" style={{ width: w, height: 12 }} />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="border-b border-[#1e1e3a]/50 px-4 py-3.5 flex gap-6 items-center">
            <div className="animate-shimmer rounded" style={{ width: 30, height: 14 }} />
            <div className="animate-shimmer rounded" style={{ width: 88, height: 14 }} />
            <div className="animate-shimmer rounded" style={{ width: 52, height: 14 }} />
            <div className="animate-shimmer rounded-full" style={{ width: 28, height: 20 }} />
            <div className="animate-shimmer rounded" style={{ width: 38, height: 14 }} />
            <div className="animate-shimmer rounded-full" style={{ width: 40, height: 20 }} />
            <div className="animate-shimmer rounded" style={{ width: 28, height: 18 }} />
            <div className="animate-shimmer rounded-full" style={{ width: 50, height: 22 }} />
          </div>
        ))}
      </div>

      {/* Skeleton: GanttPanel — three stacked horizontal blocks */}
      <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-[#1e1e3a]" />
          <div className="animate-shimmer rounded" style={{ width: 200, height: 12 }} />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-[#1e1e3a] bg-[#0a0a14] p-4">
              <div className="animate-shimmer rounded mb-3" style={{ width: 170, height: 14 }} />
              <div className="animate-shimmer rounded" style={{ width: '100%', height: 75 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton: MetricsPanel — table + 3 chart placeholders */}
      <div className="mb-8 rounded-xl border border-[#1e1e3a] bg-[#0f0f1e] p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-1 h-4 rounded-full bg-[#1e1e3a]" />
          <div className="animate-shimmer rounded" style={{ width: 150, height: 12 }} />
        </div>
        <div className="mb-6">
          <div className="border-b border-[#1e1e3a] pb-3 mb-3 flex gap-8">
            {[80, 48, 64, 48, 48].map((w, i) => (
              <div key={i} className="animate-shimmer rounded" style={{ width: w, height: 12 }} />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-8 py-2.5">
              {[100, 48, 48, 48, 56].map((w, j) => (
                <div key={j} className="animate-shimmer rounded" style={{ width: w, height: 14 }} />
              ))}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg border border-[#1e1e3a] bg-[#0a0a14] p-4">
              <div className="animate-shimmer rounded mb-3" style={{ width: 110, height: 12 }} />
              <div className="animate-shimmer rounded" style={{ width: '100%', height: 150 }} />
            </div>
          ))}
        </div>
      </div>
    </>
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
  const [toast, setToast] = useState({ visible: false, message: '' });
  const [appPhase, setAppPhase] = useState('splash'); // splash → skeleton → ready | error
  const toastTimerRef = useRef(null);
  const healthResolvedRef = useRef(false);
  const skeletonStartRef = useRef(null);

  // Splash done → move to skeleton, start the clock
  const splashDoneRef = useRef(() => {
    setAppPhase('skeleton');
    skeletonStartRef.current = Date.now();
  });

  // On mount: check health (starts during splash)
  useEffect(() => {
    let cancelled = false;

    // 15-second hard timeout
    const timeout = setTimeout(() => {
      if (!healthResolvedRef.current && !cancelled) {
        healthResolvedRef.current = true;
        setAppPhase('error');
      }
    }, 15000);

    getHealth()
      .then((h) => {
        if (cancelled) return;
        healthResolvedRef.current = true;
        setHealth(h);
        clearTimeout(timeout);
      })
      .catch(() => {
        if (cancelled) return;
        healthResolvedRef.current = true;
        setHealth(null);
        clearTimeout(timeout);
      });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, []);

  // Skeleton → Ready transition: waits for BOTH health resolved AND minimum visible time
  useEffect(() => {
    if (appPhase !== 'skeleton' || !healthResolvedRef.current) return;

    // Minimum skeleton visible time: 300ms (just a blink on fast connections)
    const elapsed = Date.now() - (skeletonStartRef.current || Date.now());
    const remaining = Math.max(300 - elapsed, 0);

    const timer = setTimeout(() => setAppPhase('ready'), remaining);
    return () => clearTimeout(timer);
  }, [appPhase]);

  // Re-check: when health resolves while skeleton is showing
  useEffect(() => {
    if (health !== null && appPhase === 'skeleton') {
      const elapsed = Date.now() - (skeletonStartRef.current || Date.now());
      const remaining = Math.max(300 - elapsed, 0);
      const timer = setTimeout(() => setAppPhase('ready'), remaining);
      return () => clearTimeout(timer);
    }
  }, [health, appPhase]);

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await runSimulation(controls);
      setData(result);

      // Step 7: Success toast
      const compositeWinner = result.metrics?.winner?.composite_score || 'IRIS';
      setToast({
        visible: true,
        message: `Simulation complete — ${compositeWinner} wins composite score`,
      });
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(
        () => setToast((prev) => ({ ...prev, visible: false })),
        3000
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (appPhase === 'splash') {
    return <SplashScreen onComplete={splashDoneRef.current} />;
  }

  // Connection failure — backend didn't respond within 15s
  if (appPhase === 'error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6"
        style={{ background: 'radial-gradient(ellipse at center, #0d0d1e 0%, #080810 70%)' }}
      >
        <div className="text-6xl mb-5">⚡</div>
        <h1 className="text-2xl font-bold text-[#f1f5f9] mb-2">Connection Failed</h1>
        <p className="text-[#94a3b8] max-w-md mb-8 leading-relaxed">
          Could not reach the IRIS backend server. Please ensure the backend is running
          and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-8 py-3 rounded-xl bg-[#6366f1] text-white font-semibold text-sm hover:bg-[#818cf8] transition-colors"
        >
          Retry Connection
        </button>
        <p className="text-[#475569] text-xs mt-6">
          Expected at <code className="text-[#6366f1]">http://localhost:5000</code>
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-[#f1f5f9] relative overflow-x-hidden">
      {/* Skeleton overlay — visible during skeleton phase, crossfades out */}
      <div
        className="absolute inset-0 z-20"
        style={{
          opacity: appPhase === 'skeleton' ? 1 : 0,
          pointerEvents: appPhase === 'skeleton' ? 'auto' : 'none',
          transition: 'opacity 0.5s ease-out',
        }}
      >
        <DashboardSkeleton />
      </div>

      {/* Real dashboard — crossfades in */}
      <div
        style={{
          opacity: appPhase === 'ready' ? 1 : 0,
          transform: appPhase === 'ready' ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease-out, transform 0.6s ease-out',
        }}
      >
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
              <GanttPanel results={data.results} metrics={data.metrics} timeQuantum={controls.timeQuantum} />
              <MetricsPanel metrics={data.metrics} />
              {data.research_summary && data.research_summary !== '' && (
                <ResearchSummary summary={data.research_summary} meta={data.meta} />
              )}
            </>
          )}

          {!data && !loading && <EmptyState />}
        </main>
      </div>

      {/* Toast Notification */}
      <Toast visible={toast.visible} message={toast.message} />
    </div>
  );
}
