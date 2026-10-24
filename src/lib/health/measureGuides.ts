export type MeasureKey = 'weight' | 'waist' | 'neck' | 'chest' | 'belly' | 'hips' | 'thigh' | 'biceps_l' | 'calf';

export interface MeasureGuide {
  key: MeasureKey;
  label: string;
  where: string;
  tip: string;
  /** Poziomy znacznik na sylwetce (współrzędne w viewBox 0 0 120 230); brak dla wagi. */
  mark: { y: number; x1: number; x2: number } | null;
}

export const GENERAL_TIP = 'Mierz rano, na czczo, po toalecie. Taśma przylega, ale nie uciska, i leży poziomo. Za każdym razem ten sam punkt.';

export const MEASURE_GUIDES: Record<MeasureKey, MeasureGuide> = {
  weight: { key: 'weight', label: 'Waga', where: 'Rano, po toalecie, przed jedzeniem i piciem, w tej samej porze i na tej samej wadze.', tip: 'Waż się bez ubrania lub w tym samym stroju.', mark: null },
  waist: { key: 'waist', label: 'Talia', where: 'W najwęższym miejscu tułowia, zwykle kilka cm nad pępkiem.', tip: 'Stój prosto, zmierz po spokojnym wydechu, brzucha nie wciągaj.', mark: { y: 98, x1: 37, x2: 83 } },
  neck: { key: 'neck', label: 'Szyja', where: 'Tuż pod krtanią (jabłkiem Adama), taśma poziomo.', tip: 'Patrz przed siebie, nie unoś barków.', mark: { y: 37, x1: 51, x2: 69 } },
  chest: { key: 'chest', label: 'Klatka', where: 'Na wysokości sutków, pod pachami i wokół łopatek.', tip: 'Ręce luźno wzdłuż ciała, pomiar po wydechu.', mark: { y: 66, x1: 32, x2: 88 } },
  belly: { key: 'belly', label: 'Brzuch', where: 'Na wysokości pępka.', tip: 'Stój swobodnie, brzucha nie wciągaj i nie wypychaj.', mark: { y: 112, x1: 35, x2: 85 } },
  hips: { key: 'hips', label: 'Biodra', where: 'W najszerszym miejscu pośladków, patrząc z boku.', tip: 'Stopy razem, ciężar po równo na obu nogach.', mark: { y: 132, x1: 35, x2: 85 } },
  thigh: { key: 'thigh', label: 'Udo', where: 'Tuż pod fałdą pośladkową, w najgrubszym miejscu uda.', tip: 'Stopy na szerokość bioder, ciężar po równo.', mark: { y: 150, x1: 44, x2: 63 } },
  biceps_l: { key: 'biceps_l', label: 'Biceps (lewy)', where: 'W połowie drogi między barkiem a łokciem, lewe ramię.', tip: 'Ramię rozluźnione, zawsze ta sama pozycja (rozluźnione albo napięte, nie mieszaj).', mark: { y: 74, x1: 89, x2: 101 } },
  calf: { key: 'calf', label: 'Łydka', where: 'W najszerszym miejscu łydki.', tip: 'Stój prosto, ciężar na obu nogach.', mark: { y: 188, x1: 44, x2: 63 } },
};
