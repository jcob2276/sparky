import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Target, Sparkles } from 'lucide-react';
import { Pressable } from '../ui/ControlPrimitives';

export default function PokerDecisionPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'decision_lab' | 'libregto'>('decision_lab');

  const currentSrc = activeTab === 'decision_lab' ? '/poker/index.html' : '/libregto/index.html';

  return (
    <div className="min-h-screen w-full bg-background text-text-primary flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border-custom/50 bg-surface-1/90 backdrop-blur px-4 py-3 flex items-center justify-between shrink-0">
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
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/10 text-success border border-success/20 font-black text-sm">
              ♠
            </div>
            <div>
              <h1 className="text-sm font-bold text-text-primary flex items-center gap-2">
                Poker Decision Lab
                <span className="text-3xs font-mono px-1.5 py-0.2 bg-success/10 text-success border border-success/20 rounded">
                  Mental Models
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Tab switchers & External Link */}
        <div className="flex items-center gap-2">
          <div className="flex bg-surface-2 p-0.5 rounded-lg border border-border-custom text-xs">
            <Pressable onClick={() => setActiveTab('decision_lab')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                activeTab === 'decision_lab'
                  ? 'bg-success text-on-accent shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Target size={13} />
              <span>Decyzje & EV</span>
            </Pressable>
            <Pressable onClick={() => setActiveTab('libregto')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-medium transition ${
                activeTab === 'libregto'
                  ? 'bg-success text-on-accent shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Sparkles size={13} />
              <span>LibreGTO</span>
            </Pressable>
          </div>

          <a
            href={currentSrc}
            target="_blank"
            rel="noopener noreferrer"
            title="Otwórz pełnoekranowo w nowej karcie"
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-3 transition"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </header>

      {/* Main Interactive Embed Frame */}
      <main className="flex-1 w-full h-[calc(100vh-53px)] overflow-hidden bg-background">
        <iframe
          src={currentSrc}
          title="Poker Decision Lab"
          className="w-full h-full border-none"
        />
      </main>
    </div>
  );
}
