import { Bluetooth, RefreshCw, ShieldCheck } from 'lucide-react';
import { OuraBleConnectedView } from './OuraBleConnectedView';
import { OuraBleDeviceLists } from './OuraBleDeviceLists';
import { useOuraBleSettings } from './useOuraBleSettings';

export default function OuraBleSettingsPanel() {
  const model = useOuraBleSettings();
  const isDiscovering = model.state === 'found' || model.state === 'scanning';
  const isBusy = model.state === 'scanning' || model.state === 'connecting';

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-5 text-white shadow-2xl backdrop-blur-xl space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className={`h-8 w-8 rounded-xl flex items-center justify-center border ${
            model.state === 'connected'
              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
              : isBusy
                ? 'bg-teal-500/20 border-teal-500/30 text-teal-400 animate-pulse'
                : 'bg-teal-500/20 border-teal-500/30 text-teal-400'
          }`}>
            <Bluetooth size={18} />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-tight text-white">Oura Ring Gen 3 Direct BLE</h3>
            <p className="text-3xs text-slate-400">Bezpośrednia synchronizacja bez chmury Oury</p>
          </div>
        </div>
        <span className={`text-3xs font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
          model.state === 'connected'
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : model.state === 'connecting'
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse'
              : model.state === 'scanning'
                ? 'bg-teal-500/10 text-teal-300 border-teal-500/30 animate-pulse'
                : 'bg-white/5 text-slate-400 border-white/10'
        }`}>
          {model.state === 'connected' ? '● Live BLE'
            : model.state === 'connecting' ? '● Łączenie...'
              : model.state === 'scanning' ? '● Skanowanie...'
                : model.state === 'error' ? 'Błąd'
                  : 'Rozłączono'}
        </span>
      </div>

      <p className="text-2xs text-slate-400 font-medium">{model.statusMsg}</p>

      {model.state === 'connected' && (
        <OuraBleConnectedView
          device={model.connectedDevice}
          savedDevice={model.savedDevice}
          batteryLevel={model.batteryLevel}
          currentBpm={model.currentBpm}
          historySyncing={model.historySyncing}
          historyStatus={model.historyStatus}
          onFetchHistory={model.fetchHistory}
          onDisconnect={model.disconnect}
        />
      )}

      {isDiscovering && (
        <OuraBleDeviceLists
          ouraDevices={model.ouraDevices}
          otherDevices={model.otherDevices}
          disabled={model.state === 'connecting'}
          onPair={model.pair}
        />
      )}

      {model.state === 'found' && model.devices.length === 0 && (
        <div className="py-4 text-center space-y-1">
          <p className="text-sm font-bold text-slate-400">Nie znaleziono urządzeń</p>
          <p className="text-3xs text-slate-500">
            Upewnij się, że pierścień jest blisko i nie łączy się z inną aplikacją.
          </p>
        </div>
      )}

      {model.state !== 'connected' && (
        model.needsAdoption ? (
          <button
            type="button"
            onClick={model.adopt}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-extrabold text-xs uppercase tracking-widest"
          >
            <ShieldCheck size={14} /> Świadomie sparuj ponownie
          </button>
        ) : (
          <button
            type="button"
            onClick={model.scan}
            disabled={isBusy}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 disabled:opacity-50 text-teal-300 font-extrabold text-xs uppercase tracking-widest"
          >
            <RefreshCw size={14} className={model.state === 'scanning' ? 'animate-spin' : ''} />
            {model.state === 'scanning' ? 'Skanowanie BLE...'
              : model.state === 'found' ? 'Szukaj ponownie'
                : 'Szukaj Oura Ring'}
          </button>
        )
      )}
    </div>
  );
}
