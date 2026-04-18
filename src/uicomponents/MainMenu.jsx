import React, { useEffect, useState } from 'react';

const MainMenu = ({ onStart, onLeaderboard, onSettings }) => {
  const rainColumns = Array.from({ length: 24 }, (_, i) => i);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delayed fade-in for a cinematic entry
    const t = setTimeout(() => setVisible(true), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="absolute inset-0 z-50 overflow-hidden bg-[#01070d]">
      {/* Subtle data-rain — dimmer, less noisy */}
      <div className="pointer-events-none absolute inset-0 opacity-10">
        {rainColumns.map((col) => (
          <div
            key={col}
            className="menu-rain"
            style={{
              left: `${(col / rainColumns.length) * 100}%`,
              animationDelay: `${(col % 7) * 0.4}s`,
              animationDuration: `${7 + (col % 5)}s`,
              fontSize: '11px',
              color: '#00e5ff',
            }}
          >
            01011011010101
          </div>
        ))}
      </div>

      {/* Horizontal scanline rule at top */}
      <div className="absolute top-0 left-0 right-0 h-px bg-cyan-900/40" />

      <div
        className="relative flex h-full flex-col items-center justify-center px-6 text-center"
        style={{ transition: 'opacity 600ms ease, transform 600ms ease', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}
      >
        {/* Eyebrow */}
        <p className="mb-5 text-[9px] font-black uppercase tracking-[0.6em] text-gray-600">
          Neural Terminal // v4.04
        </p>

        {/* Title — static glow, NO glitch animation */}
        <h1
          className="mb-3 text-5xl font-black tracking-[0.15em] text-white md:text-7xl"
          style={{ textShadow: '0 0 50px rgba(0,200,255,0.25)' }}
        >
          PROMPT_OVERRIDE
        </h1>

        <p className="mb-10 text-[10px] uppercase tracking-[0.3em] text-gray-600">
          Operator channel locked. Select a protocol.
        </p>

        {/* Menu panel */}
        <div className="w-full max-w-sm flex flex-col gap-2">
          <button
            onClick={onStart}
            className="w-full py-4 bg-white text-black font-black text-sm uppercase tracking-[0.25em] hover:bg-cyan-100 transition-colors"
          >
            [ INITIATE_SYNC ]
          </button>
          <button
            onClick={onLeaderboard}
            className="w-full py-3 border border-gray-700 bg-transparent text-gray-400 font-bold text-xs uppercase tracking-[0.2em] hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            [ OPERATOR_ARCHIVES ]
          </button>
          <button
            onClick={onSettings}
            className="w-full py-3 border border-gray-700 bg-transparent text-gray-400 font-bold text-xs uppercase tracking-[0.2em] hover:border-gray-500 hover:text-gray-200 transition-colors"
          >
            [ CONFIG_LOADER ]
          </button>
        </div>

        <p className="mt-8 text-[9px] uppercase tracking-[0.3em] text-gray-700">
          Use pointer or keyboard to establish link
        </p>
      </div>

      {/* Bottom rule */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-cyan-900/30" />
    </div>
  );
};

export default MainMenu;
