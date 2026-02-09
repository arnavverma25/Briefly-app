import React, { useState } from 'react';
import { Article, VoiceName } from './types';
import { PlusIcon, SparklesIcon, BrieflyLogo } from './components/Icons';
import ArticleCard from './components/ArticleCard';
import PlayerSheet from './components/PlayerSheet';
import { useBriefing } from './hooks/useBriefing';
import { useAudioPlayer } from './hooks/useAudioPlayer';

const PRESET_PERSONAS = [
  "News Anchor",
  "Tech Vlogger",
  "Storyteller",
  "Aristocrat",
  "Sports Caster"
];

const App: React.FC = () => {
  // UI State
  const [articles, setArticles] = useState<Article[]>([
    { id: '1', title: 'Article 1', content: '', type: 'text' }
  ]);
  const [persona, setPersona] = useState(PRESET_PERSONAS[0]);
  const [voice, setVoice] = useState<VoiceName>(VoiceName.Fenrir);
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);

  // Hooks
  const { generationState, headline, scriptTokens, generateBriefing } = useBriefing();
  const player = useAudioPlayer();

  // Handlers
  const addArticleInput = () => {
    setArticles([...articles, { id: crypto.randomUUID(), title: `Article ${articles.length + 1}`, content: '', type: 'text' }]);
  };

  const removeArticleInput = (id: string) => {
    if (articles.length === 1) return;
    setArticles(articles.filter(a => a.id !== id));
  };

  const updateArticle = (id: string, updates: Partial<Article>) => {
    setArticles(articles.map(a => a.id === id ? { ...a, ...updates } : a));
  };

  const handleGenerate = async () => {
    const validArticles = articles.filter(a => a.content.trim().length > 0);
    if (validArticles.length === 0) {
      alert("Please enter at least one article content or URL.");
      return;
    }
    
    // Mark processing for URLs
    setArticles(prev => prev.map(a => 
      (a.type === 'url' && a.content.trim().length > 0) ? { ...a, isProcessing: true } : a
    ));

    player.stop();
    setIsPlayerOpen(false);

    const result = await generateBriefing(validArticles, persona, voice);
    
    // Clear processing flags
    setArticles(prev => prev.map(a => ({ ...a, isProcessing: false })));

    if (result) {
        player.loadAudio(result.buffer, result.ctx);
        setIsPlayerOpen(true);
        // Small delay to allow UI transition
        setTimeout(() => player.play(), 500);
    }
  };

  const isLoading = generationState.status !== 'idle' && generationState.status !== 'ready' && generationState.status !== 'error';

  const getVoiceEmoji = (v: VoiceName) => {
    switch (v) {
      case VoiceName.Fenrir: return '🌹';
      case VoiceName.Puck: return '🌻';
      case VoiceName.Kore: return '🌸';
      case VoiceName.Zephyr: return '🌷';
      case VoiceName.Charon: return '🪷';
      default: return '🌼';
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning!";
    if (hour >= 12 && hour < 18) return "Good Afternoon!";
    return "Good Evening!";
  };

  return (
    <div className="mx-auto max-w-md h-[100dvh] bg-slate-50 relative shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 bg-slate-50/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between flex-shrink-0">
         <div className="flex items-center gap-2">
            <div className="text-cyan-600"><BrieflyLogo className="w-6 h-6" /></div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Briefly</h1>
         </div>
         {generationState.status === 'ready' && (
           <button 
             onClick={() => setIsPlayerOpen(!isPlayerOpen)}
             className="text-xs font-bold text-cyan-600 bg-cyan-50 px-3 py-1 rounded-full"
           >
             {isPlayerOpen ? 'Hide Player' : 'Show Player'}
           </button>
         )}
      </header>

      <main className="flex-1 overflow-y-auto pb-40 px-4 pt-4 no-scrollbar space-y-6">
        <div className="space-y-1">
          <h2 className="text-2xl font-extrabold text-slate-900 leading-tight">{getGreeting()}</h2>
          <p className="text-slate-500 text-sm font-medium">Add articles below to create your briefing.</p>
        </div>

        <section className="space-y-4">
          {articles.map((article, index) => (
            <ArticleCard
                key={article.id}
                index={index}
                article={article}
                canRemove={articles.length > 1}
                onRemove={() => removeArticleInput(article.id)}
                onUpdate={(updates) => updateArticle(article.id, updates)}
            />
          ))}

          <button
            onClick={addArticleInput}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-cyan-300 hover:text-cyan-500 transition-colors flex items-center justify-center gap-2 text-sm font-bold"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Article</span>
          </button>
        </section>

        {/* Config Sections */}
        <section className="space-y-4">
           <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Vibe</h3>
             <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x snap-mandatory">
                {PRESET_PERSONAS.map(p => (
                  <button
                    key={p}
                    onClick={() => setPersona(p)}
                    className={`flex-shrink-0 snap-start px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                      persona === p 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white border-slate-100 text-slate-500'
                    }`}
                  >
                    {p}
                  </button>
                ))}
             </div>
           </div>

           <div>
             <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Voice</h3>
             <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x snap-mandatory">
                {[VoiceName.Fenrir, VoiceName.Puck, VoiceName.Kore, VoiceName.Zephyr, VoiceName.Charon].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVoice(v)}
                    className={`flex-shrink-0 snap-start w-20 h-20 rounded-xl flex flex-col items-center justify-center gap-1 border transition-all ${
                      voice === v 
                      ? 'bg-gradient-to-br from-cyan-50 to-blue-50 text-cyan-700 border-cyan-200 shadow-sm' 
                      : 'bg-white border-slate-100 text-slate-500'
                    }`}
                  >
                    <span className="text-2xl opacity-80">
                      {getVoiceEmoji(v)}
                    </span>
                    <span className="text-[10px] font-bold">{v}</span>
                  </button>
                ))}
             </div>
           </div>
        </section>
        
        <div className="h-20" />
      </main>

      {/* FAB */}
      <div className="absolute bottom-6 left-0 right-0 px-6 pointer-events-none z-20">
         <button
            onClick={handleGenerate}
            disabled={isLoading}
            className={`
               pointer-events-auto w-full py-4 rounded-2xl shadow-xl transition-all duration-300
               flex items-center justify-center gap-3 font-bold text-white
               ${isLoading ? 'bg-slate-800' : 'bg-slate-900 hover:scale-[1.02] active:scale-95'}
            `}
         >
            {isLoading ? (
               <>
                 <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 <span className="text-sm">{generationState.message}</span>
               </>
            ) : (
               <>
                 <SparklesIcon className="w-5 h-5 text-cyan-300" />
                 <span>Generate Briefing</span>
               </>
            )}
         </button>
      </div>

      <PlayerSheet 
        isOpen={isPlayerOpen}
        onClose={() => setIsPlayerOpen(false)}
        isPlaying={player.isPlaying}
        onTogglePlay={player.toggle}
        currentTime={player.currentTime}
        duration={player.duration}
        onSeek={player.seek}
        analyser={player.analyser}
        headline={headline}
        persona={persona}
        scriptTokens={scriptTokens}
      />
    </div>
  );
};

export default App;