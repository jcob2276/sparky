import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Target, Sparkles } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

export default function PokerDecisionPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'decision_lab' | 'libregto'>('decision_lab');

  const currentSrc = activeTab === 'decision_lab' ? '/poker/index.html' : '/libregto/index.html';

  return (
    <div className="min-h-screen w-full bg-[#0B0F17] text-text-primary flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border-custom/50 bg-[#0E1420]/90 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Pressable
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-solid/10 text-xs font-semibold"
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </Pressable>

          <div className="h-4 w-px bg-border-custom/40" />

          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black text-sm">
              ♠
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                Poker Decision Lab
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded">
                  Mental Models
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Tab switchers & External Link */}
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('decision_lab')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                activeTab === 'decision_lab'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Target size={13} />
              <span>Decyzje & EV</span>
            </button>
            <button
              onClick={() => setActiveTab('libregto')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                activeTab === 'libregto'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles size={13} />
              <span>LibreGTO</span>
            </button>
          </div>

          <a
            href={currentSrc}
            target="_blank"
            rel="noopener noreferrer"
            title="Otwórz pełnoekranowo w nowej karcie"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </header>

      {/* Main Interactive Embed Frame */}
      <main className="flex-1 w-full h-[calc(100vh-53px)] overflow-hidden bg-[#0B0F17]">
        <iframe
          src={currentSrc}
          title="Poker Decision Lab"
          className="w-full h-full border-none"
        />
      </main>
    </div>
  );
}
