/**
 * Drabinki progresji kalisteniki (wzór CalisthenicsMemory) —
 * tylko etykiety i dopasowanie nazwy; bez pewności coachingowej.
 */

type BwSkillStep = {
  id: string;
  label: string;
  match: RegExp;
};

type BwSkillFamily = {
  id: string;
  label: string;
  steps: BwSkillStep[];
};

export type BwSkillCue = {
  familyId: string;
  familyLabel: string;
  currentLabel: string;
  nextLabel: string | null;
  stepIndex: number;
  stepCount: number;
  summary: string;
};

/** Kolejność = rosnąca trudność. Match: najpierw najtrudniejszy szczebel. */
const BW_SKILL_FAMILIES: BwSkillFamily[] = [
  {
    id: 'pushup',
    label: 'Pompki',
    steps: [
      { id: 'wall', label: 'Pompki przy ścianie', match: /pompki?\s*(przy\s*)?ścian|wall\s*push/i },
      { id: 'knee', label: 'Pompki na kolanach', match: /pompki?\s*(na\s*)?kolan|knee\s*push/i },
      { id: 'standard', label: 'Pompki', match: /^(klasyczne\s*)?pompki?$|^(standard\s*)?push-?\s*ups?$/i },
      { id: 'diamond', label: 'Pompki diamentowe', match: /diament|diamond\s*push/i },
      { id: 'archer', label: 'Pompki archer', match: /archer\s*push|pompki?\s*archer/i },
      { id: 'onearm', label: 'Pompki na 1 ręce', match: /jednor|one-?\s*arm\s*push|1\s*r[eę]k/i },
    ],
  },
  {
    id: 'pullup',
    label: 'Podciągania',
    steps: [
      { id: 'australian', label: 'Podciągania australijskie', match: /austral|inverted\s*row|wiosłowani[ea]\s*wisi/i },
      { id: 'negative', label: 'Negatywy', match: /negatyw|negative\s*pull/i },
      { id: 'band', label: 'Podciągania z gumą', match: /(?:podci[aą]g|pull).*(?:gum|band|assisted)|(?:gum|band|assisted).*(?:podci[aą]g|pull)/i },
      { id: 'full', label: 'Podciągania', match: /^(podci[aą]gani[ea]|pull-?\s*ups?|chin-?\s*ups?)(\s+nachwytem|\s+podchwytem)?$/i },
      { id: 'l_sit', label: 'Podciągania L-sit', match: /l-?\s*sit\s*pull|podci[aą]g.*l-?\s*sit/i },
      { id: 'weighted', label: 'Podciągania z obciążeniem', match: /podci[aą]g.*(?:belt|obci|ciężar|dociąż)|weighted\s*pull/i },
    ],
  },
  {
    id: 'dip',
    label: 'Dipy',
    steps: [
      { id: 'bench', label: 'Dipy na ławce', match: /dip.*(?:ławk|bench)|bench\s*dip/i },
      { id: 'parallel', label: 'Dipy', match: /^(dipy?|dips?)$|poręcz|parallel\s*dip/i },
      { id: 'ring', label: 'Dipy na kółkach', match: /dip.*kół|ring\s*dip/i },
      { id: 'weighted', label: 'Dipy z obciążeniem', match: /dip.*(?:belt|obci|ciężar|dociąż)|weighted\s*dip/i },
    ],
  },
  {
    id: 'squat_bw',
    label: 'Przysiad BW',
    steps: [
      { id: 'box', label: 'Przysiad na box', match: /przysiad.*box|box\s*squat/i },
      { id: 'air', label: 'Przysiad BW', match: /przysiad\s*(bez|bw|własn)|air\s*squat|bodyweight\s*squat/i },
      { id: 'shrimp', label: 'Shrimp squat', match: /shrimp/i },
      { id: 'pistol', label: 'Pistol squat', match: /pistol|przysiad\s*na\s*1/i },
    ],
  },
];

const ISOMETRIC_RE = /plank|deska|hang|zwis|l-?\s*sit$|hollow|hold|izometr/i;

export function isIsometricExercise(name: string): boolean {
  return ISOMETRIC_RE.test(name.trim());
}

export function resolveBwSkillCue(exerciseName: string): BwSkillCue | null {
  const n = exerciseName.trim();
  if (!n) return null;

  for (const family of BW_SKILL_FAMILIES) {
    // Od najtrudniejszego — pierwsze trafienie wygrywa.
    for (let i = family.steps.length - 1; i >= 0; i -= 1) {
      if (!family.steps[i].match.test(n)) continue;
      const step = family.steps[i];
      const next = family.steps[i + 1] ?? null;
      const summary = next
        ? `${family.label}: ${step.label} → następny szczebel: ${next.label} (drabinka, nie nakaz).`
        : `${family.label}: ${step.label} — szczyt drabinki w tej rodzinie.`;
      return {
        familyId: family.id,
        familyLabel: family.label,
        currentLabel: step.label,
        nextLabel: next?.label ?? null,
        stepIndex: i,
        stepCount: family.steps.length,
        summary,
      };
    }
  }
  return null;
}
