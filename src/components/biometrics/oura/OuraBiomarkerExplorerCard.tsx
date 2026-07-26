/**
 * @component OuraBiomarkerExplorerCard
 * @role Eksplorator dostępnych biomarkerów bio-witalnych.
 */
import { Activity, Heart, Shield, Gauge } from 'lucide-react';
import type { OuraHealthHubData } from './types';

export function OuraBiomarkerExplorerCard({ enhanced, birthDateStr, garminVo2Max, externalVo2Source }: OuraHealthHubData) {
  const rawVascularAge = enhanced?.vascular_age ?? null;
  const activeVo2Max = garminVo2Max ?? null;
  const vo2SourceLabel = externalVo2Source ?? 'Garmin Connect / Raport Biegowy';

  const spo2 = enhanced?.spo2_percentage ?? null;
  const tempDev = enhanced?.temperature_deviation ?? null;

  let chronoAge: number | null = null;
  if (birthDateStr) {
    const birthDate = new Date(birthDateStr);
    if (!isNaN(birthDate.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - birthDate.getFullYear();
      const m = now.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
      chronoAge = age;
    }
  }

  const formatVascularAge = (vAge: number | null) => {
    if (vAge === null) return { text: '--', color: 'text-slate-400', desc: 'Brak pomiaru' };
    if (chronoAge !== null) {
      const delta = vAge - chronoAge;
      if (delta < 0) {
        return {
          text: `${vAge} lat (${delta} lat)`,
          color: 'text-emerald-400',
          desc: `Młodsze tętnice (${Math.abs(delta)} lat mniej niż wiek ${chronoAge})`,
        };
      }
      return { text: `${vAge} lat`, color: 'text-teal-400', desc: `Zgodny z wiekiem ${chronoAge}` };
    }
    return { text: `${vAge} lat`, color: 'text-emerald-400', desc: 'Elastyczność naczyniowa' };
  };

  const vAgeInfo = formatVascularAge(rawVascularAge);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-5 space-y-4 shadow-xl text-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-teal-400" />
          <h4 className="text-3xs font-black uppercase tracking-widest text-slate-400">EKSPLORATOR BIOMARKERÓW</h4>
        </div>
        <span className="text-3xs font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-md">
          Wiek: {chronoAge !== null ? `${chronoAge} lata` : '--'}
        </span>
      </div>

      {/* Grid Biomarkerów */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Wiek Naczyniowy */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
          <span className="flex items-center gap-1.5 font-bold text-rose-400 text-3xs uppercase">
            <Heart size={14} /> Wiek Naczyniowy
          </span>
          <p className={`text-lg font-black ${vAgeInfo.color}`}>{vAgeInfo.text}</p>
          <p className="text-3xs text-slate-400">{vAgeInfo.desc}</p>
        </div>

        {/* VO2Max */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
          <span className="flex items-center gap-1.5 font-bold text-teal-400 text-3xs uppercase">
            <Gauge size={14} /> VO2Max (Wydolność)
          </span>
          <p className="text-lg font-black text-white">
            {activeVo2Max ?? '--'} {activeVo2Max != null ? <span className="text-2xs font-bold text-slate-400">ml/kg/min</span> : null}
          </p>
          <p className="text-3xs text-slate-400 truncate">
            Zasilane z {vo2SourceLabel}
          </p>
        </div>

        {/* SpO2 */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
          <span className="flex items-center gap-1.5 font-bold text-sky-400 text-3xs uppercase">
            <Activity size={14} /> Saturacja SpO2
          </span>
          <p className="text-lg font-black text-white">{spo2 != null ? `${spo2.toFixed(1)}%` : '--'}</p>
          <p className="text-3xs text-slate-400">Nocne dotlenienie krwi</p>
        </div>

        {/* Temp Deviation */}
        <div className="p-3.5 rounded-2xl bg-white/5 border border-white/5 space-y-1">
          <span className="flex items-center gap-1.5 font-bold text-indigo-400 text-3xs uppercase">
            <Shield size={14} /> Odchylenie Temp. Skóry
          </span>
          <p className="text-lg font-black text-white">
            {tempDev != null ? (tempDev > 0 ? `+${tempDev}°C` : `${tempDev}°C`) : '--'}
          </p>
          <p className="text-3xs text-slate-400">Sygnał odpornościowy</p>
        </div>
      </div>

    </div>
  );
}
