export interface TargetStrainResult {
  hasRecoveryData:boolean;recoveryScore:number|null;currentStrain:number|null;targetMin:null;targetMax:null;
  zone:'calibrating';zoneLabel:string;recommendation:string;intensityCategory:'unknown';
}
/** Readiness alone cannot establish a safe training target. The shared plan decision is authoritative. */
export function calculateTargetStrain(recoveryScore:number|null|undefined,currentStrain:number|null|undefined):TargetStrainResult {
  const recovery=typeof recoveryScore === 'number' && Number.isFinite(recoveryScore) && recoveryScore>=0 && recoveryScore<=100 ? recoveryScore : null;
  const strain=typeof currentStrain === 'number' && Number.isFinite(currentStrain) && currentStrain>=0 && currentStrain<=21 ? currentStrain : null;
  return {hasRecoveryData:recovery != null,recoveryScore:recovery,currentStrain:strain,targetMin:null,targetMax:null,zone:'calibrating',
    zoneLabel:'Cel wymaga planu i historii',intensityCategory:'unknown',
    recommendation:'Wynik gotowości nie wyznacza samodzielnie celu obciążenia ani zgody na mocniejszy trening. Kieruj się wspólnym planem, ograniczeniami i zapisem wykonania.'};
}
