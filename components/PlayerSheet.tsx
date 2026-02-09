import React, { useState, useRef, useEffect } from 'react';
import { PauseIcon, PlayIcon } from './Icons';
import AudioVisualizer from './AudioVisualizer';
import { ScriptToken } from '../hooks/useBriefing';

interface PlayerSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  analyser: AnalyserNode | null;
  headline: string | null;
  persona: string;
  scriptTokens: ScriptToken[];
}

const formatTime = (time: number) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
};

const PlayerSheet: React.FC<PlayerSheetProps> = ({
  isOpen, onClose, isPlaying, onTogglePlay, currentTime, duration, onSeek, analyser, headline, persona, scriptTokens
}) => {
  const [viewMode, setViewMode] = useState<'visualizer' | 'transcript'>('visualizer');
  const [activeTokenIndex, setActiveTokenIndex] = useState(-1);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  // Update active token
  useEffect(() => {
    if (scriptTokens.length === 0) return;
    if (!isPlaying && currentTime === 0) {
        setActiveTokenIndex(-1);
        return;
    }
    const index = scriptTokens.findIndex(t => currentTime >= t.start && currentTime < t.end);
    if (index !== -1 && index !== activeTokenIndex) {
        setActiveTokenIndex(index);
    }
  }, [currentTime, scriptTokens, isPlaying, activeTokenIndex]);

  // Scroll active word
  useEffect(() => {
    if (viewMode === 'transcript' && activeWordRef.current) {
        activeWordRef.current.scrollIntoView({
            behavior: 'smooth', block: 'center', inline: 'nearest'
        });
    }
  }, [activeTokenIndex, viewMode]);

  return (
    <div 
        className={`absolute inset-0 z-40 bg-slate-900 transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1) flex flex-col ${
          isOpen ? 'translate-y-0' : 'translate-y-[100%]'
        }`}
    >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-6 text-white/90">
           <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
           </button>
           <span className="text-xs font-bold tracking-widest uppercase opacity-50">Now Playing</span>
           <div className="w-10" /> 
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
           {viewMode === 'visualizer' ? (
             <div className="flex-1 flex flex-col items-center justify-center relative">
                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-slate-900 to-transparent z-10" />
                    <div className="w-full h-64 opacity-60">
                        <AudioVisualizer analyser={analyser} isPlaying={isPlaying} />
                    </div>
                    
                    <div className="relative z-20 text-center px-8 mt-[-40px]">
                        <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold mb-4 border border-cyan-500/30">
                            AI GENERATED • {persona}
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight mb-2 line-clamp-3">
                            {headline || "Ready to play"}
                        </h2>
                        <p className="text-slate-400 text-sm">Briefly Audio</p>
                    </div>
             </div>
           ) : (
             <div className="flex-1 relative px-8">
                 <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-slate-900 to-transparent z-10 pointer-events-none" />
                 <div ref={transcriptRef} className="absolute inset-0 px-8 py-4 overflow-y-auto no-scrollbar">
                    <div className="space-y-6 pt-4 pb-20">
                        <h3 className="text-xl font-bold text-white mb-4">{headline}</h3>
                        <div className="flex flex-wrap gap-x-1.5 gap-y-1 leading-relaxed text-lg font-medium select-none">
                            {scriptTokens.length > 0 ? scriptTokens.map((token, i) => {
                                const isActive = i === activeTokenIndex;
                                const isRead = i < activeTokenIndex || (currentTime >= duration && i === scriptTokens.length - 1);
                                return (
                                    <span 
                                        key={i}
                                        ref={isActive ? activeWordRef : null}
                                        className={`transition-all duration-200 rounded px-1 -mx-1
                                            ${isActive ? 'text-cyan-300 bg-white/10 scale-105 font-bold shadow-sm' : ''}
                                            ${isRead && !isActive ? 'text-white' : ''}
                                            ${!isRead && !isActive ? 'text-slate-600' : ''}
                                        `}
                                    >
                                        {token.word}
                                    </span>
                                );
                            }) : (
                                <span className="text-white text-center w-full block mt-10 opacity-50">Transcript not available</span>
                            )}
                        </div>
                    </div>
                 </div>
                 <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none" />
             </div>
           )}
        </div>

        {/* Controls */}
        <div className="px-8 pb-12 pt-4 bg-slate-900 z-20">
           <div 
              className="group py-4 cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = Math.max(0, Math.min(1, x / rect.width));
                onSeek(percent * duration);
              }}
            >
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                 <div 
                    className="absolute top-0 left-0 h-full bg-cyan-400 rounded-full" 
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                 />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-medium text-slate-500">
                 <span>{formatTime(currentTime)}</span>
                 <span>{formatTime(duration)}</span>
              </div>
           </div>

           <div className="flex justify-center mt-4 mb-6">
              <button
                onClick={onTogglePlay}
                className="w-20 h-20 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <PauseIcon className="w-8 h-8" /> : <PlayIcon className="w-8 h-8 ml-1" />}
              </button>
           </div>
           
           <div className="flex justify-center">
             <button 
                onClick={() => setViewMode(viewMode === 'visualizer' ? 'transcript' : 'visualizer')} 
                className="text-xs font-bold text-slate-500 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/10"
             >
               {viewMode === 'visualizer' ? 'Read Transcript' : 'Show Visualizer'}
             </button>
           </div>
        </div>
    </div>
  );
};

export default PlayerSheet;