import React, { useEffect, useMemo, useState } from 'react';

const STAGES = [
  'KERNEL_4.04 :: BOOTSTRAP_SEQUENCE_INIT',
  'OPERATOR_SYNC :: CALIBRATING_NEURAL_CHANNELS',
  'DIRECT_LINK :: UNSTABLE_SIGNAL_LOCK_ACQUIRED',
  'SECURE_HANDOFF :: TERMINAL_ACCESS_GRANTED'
];

const BootSequence = ({ onComplete }) => {
  const [visibleLines, setVisibleLines] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const bootLines = useMemo(() => {
    return STAGES.flatMap((stage, index) => [
      `[${String(index + 1).padStart(2, '0')}] ${stage}`,
      `    STATUS :: ${index < STAGES.length - 1 ? 'PASS' : 'READY'}`
    ]);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLines(prev => {
        if (prev >= bootLines.length) {
          clearInterval(timer);
          setIsReady(true);
          return prev;
        }
        return prev + 1;
      });
    }, 220);

    return () => clearInterval(timer);
  }, [bootLines.length]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (!isReady) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        onComplete();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isReady, onComplete]);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center overflow-hidden bg-black text-cyan-300">
      <div className="boot-grid" />

      <div className="relative w-[min(920px,92vw)] rounded-2xl border border-cyan-500/30 bg-black/80 p-6 shadow-[0_0_60px_rgba(0,220,255,0.12)] backdrop-blur-sm">
        <div className="mb-4 flex items-center justify-between border-b border-cyan-900/40 pb-3">
          <h1
            className="text-xl font-black tracking-[0.3em] text-white"
            style={{ textShadow: '0 0 20px rgba(0,220,255,0.3)' }}
          >
            NEURAL_BOOT
          </h1>
          <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-gray-600">Kernel 4.04</span>
        </div>

        <div className="h-[320px] overflow-hidden rounded-lg border border-cyan-900/40 bg-[#02090d]/80 p-4 font-mono text-sm leading-7">
          {bootLines.slice(0, visibleLines).map((line, idx) => (
            <div key={`${line}-${idx}`} className="boot-line animate-[fadein_220ms_ease-out_forwards]">
              {line}
            </div>
          ))}

          {!isReady && (
            <div className="mt-4 inline-block h-5 w-3 animate-pulse bg-cyan-400/80 align-middle" />
          )}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-800">
            {isReady ? 'LINK_READY' : 'INITIALIZING_SUBSYSTEMS'}
          </span>

          <button
            type="button"
            onClick={onComplete}
            disabled={!isReady}
            className="rounded-lg border border-cyan-500/60 px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-300 transition-all disabled:cursor-not-allowed disabled:border-cyan-900/60 disabled:text-cyan-900 hover:scale-[1.03] hover:bg-cyan-500/10"
          >
            Establish Link [Enter]
          </button>
        </div>
      </div>
    </div>
  );
};

export default BootSequence;
