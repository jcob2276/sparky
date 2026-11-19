import Button from '../ui/Button';
import { ControlInput, ControlSelect } from '../ui/ControlPrimitives';
import { Link } from 'react-router-dom';
import { Save, MapPin, Watch, Calendar, ArrowLeft, User } from 'lucide-react';
import { isNativePlatform } from '../../lib/native/platform';
import NativePermissionsCard from './NativePermissionsCard';
import DeviceSignalsCard from './DeviceSignalsCard';
import type { Tables } from '../../lib/database.types';
import AiContextSettings from './AiContextSettings';
import AboutMeSettings from './AboutMeSettings';
import BrainHealth from '../biometrics/BrainHealth';
import LifeTargetsSettings from './LifeTargetsSettings';
import SettingsSection from './SettingsSection';
import ActiveSessionsCard from './ActiveSessionsCard';
import { useSettingsForm } from './useSettingsForm';

const SETTINGS_SHORTCUTS = [
  ['settings-sessions', 'Sesje'], ['settings-oura', 'Oura'], ['settings-home', 'Lokalizacja'],
  ['settings-profile', 'Profil'], ['settings-targets', 'Cele'], ['settings-ai', 'Kontekst AI'],
  ['settings-about', 'O mnie'], ['settings-calendar', 'Kalendarz Google'],
] as const;

export default function SettingsView() {
  const { session, form, setForm, profile, setProfile, saving, save, syncCalendar, startGoogleAuth } = useSettingsForm();

  if (!session) return null;

  return (
    <div className="ui-stagger min-h-screen bg-background p-5 pb-24 max-w-lg mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/dzis" aria-label="Wróć do widoku głównego" className="flex h-11 w-11 items-center justify-center rounded-lg text-text-secondary transition hover:bg-surface-2 hover:text-text-primary">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">Ustawienia</h1>
      </div>

      <nav aria-label="Sekcje ustawień" className="flex flex-wrap gap-2">
        {SETTINGS_SHORTCUTS.map(([id, label]) => <a key={id} href={`#${id}`}
          className="inline-flex min-h-11 items-center rounded-lg bg-surface-2 px-3 text-sm font-medium text-text-primary hover:bg-surface-3">{label}</a>)}
      </nav>

      <div id="settings-sessions" tabIndex={-1} className="scroll-mt-4"><ActiveSessionsCard userId={session.user.id} /></div>

      <div id="settings-oura" tabIndex={-1} className="scroll-mt-4">
        <SettingsSection icon={<Watch size={16} />} title="Oura" description="Token pozwala pobierać sen, gotowość i aktywność.">
          <ControlInput
            type="password"
            placeholder="Token dostępu Oura"
            aria-label="Token dostępu Oura"
            value={form.oura_token ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, oura_token: e.target.value }))}
            className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
          />
        </SettingsSection>
      </div>

      <div id="settings-home" tabIndex={-1} className="scroll-mt-4">
        <SettingsSection icon={<MapPin size={16} />} title="Lokalizacja domu" description="Punkt odniesienia dla wykrywania miejsc.">
          <div className="grid grid-cols-2 gap-2">
            <ControlInput
              type="number"
              step="any"
              placeholder="Szerokość geograficzna"
              aria-label="Szerokość geograficzna"
              value={form.home_lat ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, home_lat: e.target.value ? Number(e.target.value) : null }))}
              className="rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
            />
            <ControlInput
              type="number"
              step="any"
              placeholder="Długość geograficzna"
              aria-label="Długość geograficzna"
              value={form.home_lng ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, home_lng: e.target.value ? Number(e.target.value) : null }))}
              className="rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
            />
          </div>
        </SettingsSection>
      </div>

      <div id="settings-profile" tabIndex={-1} className="scroll-mt-4"><NutritionProfileSettings profile={profile} onChange={setProfile} /></div>

      <div id="settings-targets" tabIndex={-1} className="scroll-mt-4"><LifeTargetsSettings userId={session.user.id} /></div>

      <div id="settings-ai" tabIndex={-1} className="scroll-mt-4"><AiContextSettings userId={session.user.id} /></div>

      <div id="settings-about" tabIndex={-1} className="scroll-mt-4"><AboutMeSettings userId={session.user.id} /></div>

      <BrainHealth />

      {isNativePlatform() && <NativePermissionsCard userId={session.user.id} />}
      {isNativePlatform() && <DeviceSignalsCard userId={session.user.id} />}

      <div id="settings-calendar" tabIndex={-1} className="scroll-mt-4">
        <SettingsSection icon={<Calendar size={16} />} title="Google Calendar" description="Połącz konto i zsynchronizuj wydarzenia.">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={startGoogleAuth} className="flex-1">
              Połącz konto
            </Button>
            <Button type="button" variant="primary" onClick={() => { void syncCalendar(); }} className="flex-1">
              Synchronizuj teraz
            </Button>
          </div>
        </SettingsSection>
      </div>

      <Button
        type="button"
        variant="primary"
        size="lg"
        loading={saving}
        onClick={save}
        icon={<Save size={14} />}
        className="w-full"
      >
        {saving ? 'Zapisuję…' : 'Zapisz ustawienia'}
      </Button>
    </div>
  );
}

interface NutritionProfileSettingsProps {
  profile: Partial<Tables<'nutrition_profile'>>;
  onChange: (profile: Partial<Tables<'nutrition_profile'>>) => void;
}

function NutritionProfileSettings({ profile, onChange }: NutritionProfileSettingsProps) {
  return (
    <SettingsSection icon={<User size={16} />} title="Profil żywieniowy i biometria" description="Podstawa do liczenia kalorii, białka i tempa celu.">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="settings-sex" className="text-xs text-text-muted block mb-1 font-medium">Płeć</label>
          <ControlSelect
            id="settings-sex"
            value={profile.sex ?? ''}
            onChange={(e) => onChange({ ...profile, sex: e.target.value || null })}
            className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
          >
            <option value="">Wybierz...</option>
            <option value="M">Mężczyzna</option>
            <option value="F">Kobieta</option>
          </ControlSelect>
        </div>
        <div>
          <label htmlFor="settings-height" className="text-xs text-text-muted block mb-1 font-medium">Wzrost (cm)</label>
          <ControlInput
            id="settings-height"
            type="number"
            placeholder="np. 180"
            value={profile.height_cm ?? ''}
            onChange={(e) => onChange({ ...profile, height_cm: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="settings-birth" className="text-xs text-text-muted block mb-1 font-medium">Data urodzenia</label>
        <ControlInput
            id="settings-birth"
          type="date"
          value={profile.birth_date ? profile.birth_date.slice(0, 10) : ''}
          onChange={(e) => onChange({ ...profile, birth_date: e.target.value || null })}
          className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="settings-fat" className="text-xs text-text-muted block mb-1 font-medium">Docelowy tłuszcz (%)</label>
          <ControlInput
            id="settings-fat"
            type="number"
            step="0.1"
            placeholder="np. 12"
            value={profile.goal_body_fat ?? ''}
            onChange={(e) => onChange({ ...profile, goal_body_fat: e.target.value ? Number(e.target.value) : null })}
            className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="settings-loss" className="text-xs text-text-muted block mb-1 font-medium">Cel chudnięcia (kg/tydz)</label>
          <ControlInput
            id="settings-loss"
            type="number"
            step="0.05"
            placeholder="np. 0.5"
            value={profile.weekly_loss_kg ?? ''}
            onChange={(e) => onChange({ ...profile, weekly_loss_kg: e.target.value ? Number(e.target.value) : 0.5 })}
            className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="settings-protein" className="text-xs text-text-muted block mb-1 font-medium">Białko na kg (g)</label>
          <ControlInput
            id="settings-protein"
            type="number"
            step="0.1"
            placeholder="np. 2.0"
            value={profile.protein_g_per_kg ?? ''}
            onChange={(e) => onChange({ ...profile, protein_g_per_kg: e.target.value ? Number(e.target.value) : 2.0 })}
            className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
          />
        </div>
        <div>
          <label htmlFor="settings-goal-date" className="text-xs text-text-muted block mb-1 font-medium">Data docelowa</label>
          <ControlInput
            id="settings-goal-date"
            type="date"
            value={profile.goal_target_date ? profile.goal_target_date.slice(0, 10) : ''}
            onChange={(e) => onChange({ ...profile, goal_target_date: e.target.value || null })}
            className="w-full rounded-lg border border-border-custom bg-surface-solid px-3 py-2.5 text-sm"
          />
        </div>
      </div>
    </SettingsSection>
  );
}
