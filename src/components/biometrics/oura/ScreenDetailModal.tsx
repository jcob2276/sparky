import { AlertTriangle, Brain, CheckCircle2, Clock, Eye, Info, Smartphone, Zap } from "lucide-react";
import Modal from "../../ui/Modal";
import type { OuraContextInsights } from "../../../lib/biometrics/ouraContextInsights";
import { formatPhoneUsageDuration } from "@vanguard/domain";
import type { LateNightImpact, PhoneCognitiveProfile } from "@vanguard/domain";

interface ScreenDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  screen: OuraContextInsights["screen"];
  date: string;
}

const ATTENTION_TIER_COLORS: Record<PhoneCognitiveProfile["attentionTier"], string> = {
  focused: "text-success",
  normal: "text-text-secondary",
  elevated: "text-warning",
  fragmented: "text-danger",
  unknown: "text-text-muted",
};

function ImpactCard({ impact }: { impact: LateNightImpact }) {
  const Icon =
    impact.tier === "high" ? AlertTriangle :
    impact.tier === "moderate" ? Eye :
    CheckCircle2;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={impact.color} size={18} />
          <h4 className="text-sm font-medium text-text-primary">Ekspozycja wieczorna & Higiena snu</h4>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${impact.bgColor} ${impact.color}`}>
          {impact.badge}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{impact.description}</p>
      {impact.tier !== "optimal" && (
        <p className="mt-2 border-t border-border-subtle pt-2 text-xs text-text-muted">
          <span className="font-semibold text-text-secondary">Protokół:</span>{" "}
          60-minutowy bufor bez ekranu chroni fazę Deep Sleep i skraca latencję snu.
        </p>
      )}
    </div>
  );
}

type ScreenData = NonNullable<ScreenDetailModalProps["screen"]>;

function CognitiveCard({
  cognitive,
  totalMin,
  screen,
  hasUnlocks,
}: {
  cognitive: PhoneCognitiveProfile;
  totalMin: number;
  screen: ScreenData;
  hasUnlocks: boolean;
}) {
  const color = ATTENTION_TIER_COLORS[cognitive.attentionTier];
  const pct = (m: number) => `${Math.min((m / totalMin) * 100, 100)}%`;
  const socialOnly = cognitive.passiveMinutes - cognitive.entertainmentMinutes;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="text-primary" size={18} />
          <h4 className="text-sm font-medium text-text-primary">Kompozycja uwagi</h4>
        </div>
        <span className="text-xs text-text-muted">{cognitive.toolRatio}% narzędzia · {cognitive.passiveRatio}% pasywna</span>
      </div>
      <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-surface-3">
        {cognitive.toolMinutes > 0 && <div className="bg-primary" style={{ width: pct(cognitive.toolMinutes) }} />}
        {cognitive.communicationMinutes > 0 && <div className="bg-success" style={{ width: pct(cognitive.communicationMinutes) }} />}
        {cognitive.entertainmentMinutes > 0 && <div className="bg-info" style={{ width: pct(cognitive.entertainmentMinutes) }} />}
        {socialOnly > 0 && <div className="bg-warning" style={{ width: pct(socialOnly) }} />}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
        {([
          { dot: "bg-primary", label: "AI & Narzędzia", min: screen.aiMinutes ?? 0 },
          { dot: "bg-primary", label: "Przeglądarka", min: screen.browserMinutes ?? 0 },
          { dot: "bg-success", label: "Komunikacja", min: screen.messagingMinutes ?? 0 },
          { dot: "bg-info", label: "Rozrywka", min: screen.entertainmentMinutes ?? 0 },
          { dot: "bg-warning", label: "Social media", min: screen.socialMinutes ?? 0 },
        ] as const).filter((r) => r.min > 0).map((r) => (
          <div key={r.label} className="flex items-center justify-between rounded-lg bg-surface-1 px-2 py-1.5">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span className={`h-2 w-2 shrink-0 rounded-full ${r.dot}`} />
              {r.label}
            </span>
            <span className="font-mono text-text-primary">{formatPhoneUsageDuration(r.min)}</span>
          </div>
        ))}
      </div>
      {hasUnlocks && cognitive.attentionLabel && (
        <p className={`mt-3 flex items-center gap-1.5 text-xs ${color}`}>
          <Zap size={12} className="shrink-0" />
          {cognitive.attentionLabel}
        </p>
      )}
    </div>
  );
}

function AppRankingCard({ topApps }: { topApps: Array<{ app: string; pkg: string; min: number }> }) {
  const maxMin = topApps.length > 0 ? Math.max(...topApps.map((a) => a.min)) : 1;
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-2 p-4">
      <div className="flex items-center gap-2">
        <Clock className="text-text-muted" size={16} />
        <h4 className="text-sm font-medium text-text-primary">Najpopularniejsze aplikacje</h4>
      </div>
      <div className="mt-3 space-y-2.5">
        {topApps.slice(0, 7).map((item) => (
          <div key={item.pkg}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-text-primary">{item.app}</span>
              <span className="font-mono text-text-secondary">{formatPhoneUsageDuration(item.min)}</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
              <div className="h-full rounded-full bg-info/60" style={{ width: `${Math.round((item.min / maxMin) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScreenDetailModal({ isOpen, onClose, screen, date }: ScreenDetailModalProps) {
  if (!screen || screen.status !== "available") return null;
  const totalMin = screen.totalMinutes ?? 0;
  const lateNightMin = screen.lateNightMinutes ?? 0;
  const cognitive = screen.cognitiveProfile;
  const topApps = screen.topApps ?? [];
  const hasUnlocks = (cognitive?.unlocks ?? 0) > 0;
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={<div className="flex items-center gap-2 text-text-primary"><Smartphone className="text-info" size={20} /><span>Czas przed ekranem & Rytm biologiczny</span></div>}
      subtitle={`Dzień poprzedzający sen ${date}`}
    >
      <div className="space-y-4">
        {totalMin < 15 && (
          <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2.5">
            <Info size={14} className="mt-0.5 shrink-0 text-warning" />
            <p className="text-xs leading-relaxed text-text-secondary">
              Zarejestrowano tylko <span className="font-medium text-warning">{totalMin} min</span>{" "}
              czasu ekranu — synchronizacja mogła nastąpić zanim dane były kompletne.
            </p>
          </div>
        )}
        <div className={`grid gap-2 ${hasUnlocks ? "grid-cols-3" : "grid-cols-2"}`}>
          <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
            <p className="text-xs text-text-muted">Łączny czas</p>
            <p className="mt-1 text-xl font-light text-text-primary">{screen.formattedTotal ?? `${totalMin} min`}</p>
            <p className="text-xs text-text-muted">{totalMin} minut</p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
            <p className="text-xs text-text-muted">Późny wieczór</p>
            <p className={`mt-1 text-xl font-light ${lateNightMin > 0 ? (screen.lateNightImpact?.color ?? "text-text-primary") : "text-success"}`}>
              {lateNightMin > 0 ? `${lateNightMin} min` : "Brak"}
            </p>
            <p className="text-xs text-text-muted">23:00–04:00</p>
          </div>
          {hasUnlocks && (
            <div className="rounded-xl border border-border-subtle bg-surface-2 p-3 text-center">
              <p className="text-xs text-text-muted">
                śr. ~{cognitive!.avgSessionMinutes ?? cognitive!.unlockIntervalMinutes} min / sesja
              </p>
            </div>
          )}
        </div>
        {screen.lateNightImpact && <ImpactCard impact={screen.lateNightImpact} />}
        {cognitive && totalMin > 0 && <CognitiveCard cognitive={cognitive} totalMin={totalMin} screen={screen} hasUnlocks={hasUnlocks} />}
        {topApps.length > 0 && <AppRankingCard topApps={topApps} />}
      </div>
    </Modal>
  );
}
