import React, { useEffect, useState } from 'react';

const FloorTitle = ({ floor, meta }) => {
  const title = `> SECTOR_${String(floor).padStart(2, '0')}_INIT`;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in on mount
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div
      className="absolute inset-0 z-[90] flex flex-col items-center justify-center bg-black/70 pointer-events-none"
      style={{ transition: 'opacity 400ms ease', opacity: visible ? 1 : 0 }}
    >
      {/* Single static glow — no pulsing/flickering */}
      <h2
        className="text-5xl md:text-7xl font-black tracking-[0.25em] text-white"
        style={{ textShadow: '0 0 40px rgba(0,220,255,0.45), 0 0 80px rgba(0,220,255,0.15)' }}
      >
        {title}
      </h2>

      {/* Thin separator */}
      <div className="mt-5 mb-5 w-48 h-px bg-cyan-800/50" />

      {/* Neutral metadata tags — no colour clashing */}
      <div className="flex flex-wrap justify-center gap-3 text-[11px] font-bold tracking-[0.2em] text-gray-400">
        <span className="px-3 py-1.5 border border-gray-700 bg-gray-900/60">[LUCK: {meta.luckIndex}]</span>
        <span className="px-3 py-1.5 border border-gray-700 bg-gray-900/60">[THREAT: {meta.threatLevel}]</span>
        <span className="px-3 py-1.5 border border-gray-700 bg-gray-900/60">[SYNC: {meta.syncRestriction}]</span>
      </div>
    </div>
  );
};

export default FloorTitle;
