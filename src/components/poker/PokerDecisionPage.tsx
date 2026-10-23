import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Target, Sparkles } from 'lucide-react';
import IconButton from '../ui/IconButton';
import Tabs from '../ui/Tabs';

type PokerTab = 'decision_lab' | 'libregto';

const TABS = [
  { key: 'decision_lab', label: 'Decyzje i EV', icon: <Target size={14} /> },
  { key: 'libregto', label: 'LibreGTO', icon: <Sparkles size={14} /> },
];

const SOURCES: Record<PokerTab, string> = {
  decision_lab: '/poker/index.html?embed=1',
  libregto: '/libregto/index.html?embed=1',
};

export default function PokerDecisionPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PokerTab>('decision_lab');
  const currentSrc = SOURCES[activeTab];
  const standaloneSrc = currentSrc.replace('?embed=1', '');

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-text-primary">
      <header className="ui-app-header flex shrink-0 items-center gap-2 px-2 pt-[env(safe-area-inset-top)]">
        <IconButton
          icon={<ArrowLeft size={20} />}
          label="Wróć do pulpitu"
          onClick={() => navigate('/dashboard')}
          className="!h-11 !w-11 shrink-0"
        />
        <h1 className="hidden shrink-0 text-base font-semibold tracking-tight sm:block">Poker Decision Lab</h1>
        <Tabs
          tabs={TABS}
          active={activeTab}
          onChange={(key) => setActiveTab(key as PokerTab)}
          className="my-1.5 min-w-0 flex-1 rounded-xl bg-surface-2 p-0.5 [&_.ui-tab]:min-h-[40px] [&_.ui-tab]:rounded-[10px]"
        />
        <a
          href={standaloneSrc}
          target="_blank"
          rel="noopener noreferrer"
          title="Otwórz pełnoekranowo w nowej karcie"
          aria-label="Otwórz pełnoekranowo w nowej karcie"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-text-secondary transition hover:bg-surface-3 hover:text-text-primary"
        >
          <ExternalLink size={18} />
        </a>
      </header>

      <main className="min-h-0 w-full flex-1 overflow-hidden bg-background">
        <iframe key={activeTab} src={currentSrc} title="Poker Decision Lab" className="h-full w-full border-none" />
      </main>
    </div>
  );
}
