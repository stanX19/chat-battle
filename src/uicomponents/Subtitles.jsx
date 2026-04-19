import React, { useState, useEffect } from 'react';

const Subtitles = ({ message, onSkip }) => {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayText('');
    setIndex(0);
  }, [message]);

  useEffect(() => {
    if (index < message.length) {
      const timeout = setTimeout(() => {
        setDisplayText((prev) => prev + message[index]);
        setIndex((prev) => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [index, message]);

  return (
    <div className="absolute bottom-10 left-0 right-0 z-[100] flex flex-col items-center pointer-events-none">
      <div className="relative group w-full max-w-2xl px-6">
        {/* Background Blur & Glitch Plate */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-md border-t border-b border-cyan-500/30" />
        
        {/* Skip Container (Clickable) */}
        <div className="absolute -top-12 right-6 pointer-events-auto">
          <button 
            onClick={onSkip}
            className="px-3 py-1 bg-black/80 border border-cyan-900 text-cyan-500 text-[10px] font-bold tracking-widest hover:bg-cyan-900/40 hover:text-white transition-all cursor-pointer uppercase"
          >
            Skip [ESC]
          </button>
        </div>

        {/* Content */}
        <div className="relative py-4 min-h-[80px]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-1 flex flex-col items-center">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_8px_#22d3ee]" />
              <div className="w-px h-full bg-cyan-900/50 mt-1" />
            </div>
            
            <div className="flex-grow">
              <div className="text-[11px] font-black text-cyan-800 tracking-tighter mb-1 uppercase">
                Geometric Unit 404 // Protocol Link
              </div>
              <div className="text-white font-medium text-lg md:text-xl tracking-tight leading-snug terminal-glow">
                {displayText}
                {index < message.length && <span className="inline-block w-2.5 h-5 ml-1 bg-cyan-400 animate-pulse align-middle" />}
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Detail Strip */}
        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-full" />
      </div>

      {/* Aesthetic Side Brackets (Pure Visual) */}
      <div className="absolute -left-4 top-1/2 -translate-y-1/2 h-16 w-1 border-l-2 border-cyan-500/20" />
      <div className="absolute -right-4 top-1/2 -translate-y-1/2 h-16 w-1 border-r-2 border-cyan-500/20" />
    </div>
  );
};

export default Subtitles;
