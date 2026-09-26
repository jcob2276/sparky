/**
 * superinvestorPhoto.ts — Oficjalne zdjęcia, logotypy spółek i eleganckie inicjały
 * dla 59 superinwestorów 13F.
 */

export interface InvestorAvatarData {
  type: 'image' | 'initials';
  url?: string;
  initials: string;
  badgeClasses: string;
}

const KNOWN_PORTRAITS: Record<string, string> = {
  // Superinwestorzy (Wikimedia Commons public domain / CC-BY-SA via Special:FilePath)
  'Warren Buffett': 'https://commons.wikimedia.org/wiki/Special:FilePath/Warren_Buffett_at_the_2015_SelectUSA_Investment_Summit.jpg?width=300',
  'Bill Ackman': 'https://commons.wikimedia.org/wiki/Special:FilePath/Bill_Ackman_%2839958742834%29_%28cropped%29.jpg?width=300',
  'Cathie Wood': 'https://commons.wikimedia.org/wiki/Special:FilePath/Cathie_Wood_in_2021.jpg?width=300',
  'Carl Icahn': 'https://commons.wikimedia.org/wiki/Special:FilePath/Carl_Icahn_2016.jpg?width=300',
  'Ray Dalio': 'https://commons.wikimedia.org/wiki/Special:FilePath/Ray_Dalio_2020.jpg?width=300',
  'Michael Burry': 'https://commons.wikimedia.org/wiki/Special:FilePath/Michael_Burry_2015.jpg?width=300',
  'Ken Griffin': 'https://commons.wikimedia.org/wiki/Special:FilePath/Ken_Griffin_2022.jpg?width=300',
  'Jim Simons': 'https://commons.wikimedia.org/wiki/Special:FilePath/Jim_Simons_at_MIT.jpg?width=300',
  'George Soros': 'https://commons.wikimedia.org/wiki/Special:FilePath/George_Soros_-_Festival_d_Economia_2012_01.jpg?width=300',
  'David Tepper': 'https://commons.wikimedia.org/wiki/Special:FilePath/David_Tepper_2018.jpg?width=300',
  'Stanley Druckenmiller': 'https://commons.wikimedia.org/wiki/Special:FilePath/Stanley_Druckenmiller_2017.jpg?width=300',
  'Brad Gerstner': 'https://commons.wikimedia.org/wiki/Special:FilePath/Brad_Gerstner_2022.jpg?width=300',
  'Cliff Asness': 'https://commons.wikimedia.org/wiki/Special:FilePath/Cliff_Asness_2015.jpg?width=300',
  'Chase Coleman': 'https://commons.wikimedia.org/wiki/Special:FilePath/Chase_Coleman_III_2019.jpg?width=300',
  'Chris Hohn': 'https://commons.wikimedia.org/wiki/Special:FilePath/Sir_Christopher_Hohn.jpg?width=300',
  'David Einhorn': 'https://commons.wikimedia.org/wiki/Special:FilePath/David_Einhorn_%282006%29.jpg?width=300',
  'Steve Cohen': 'https://commons.wikimedia.org/wiki/Special:FilePath/Steven_Cohen_2010.jpg?width=300',
  'Nelson Peltz': 'https://commons.wikimedia.org/wiki/Special:FilePath/Nelson_Peltz_2017.jpg?width=300',
  'Paul Tudor Jones': 'https://commons.wikimedia.org/wiki/Special:FilePath/Paul_Tudor_Jones_II.jpg?width=300',
};

const KNOWN_CORP_LOGOS: Record<string, string> = {
  'Alphabet (Google)': 'https://assets.parqet.com/logos/symbol/GOOGL?format=png',
  Amazon: 'https://assets.parqet.com/logos/symbol/AMZN?format=png',
  NVIDIA: 'https://assets.parqet.com/logos/symbol/NVDA?format=png',
  Intel: 'https://assets.parqet.com/logos/symbol/INTC?format=png',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const BADGE_COLOR_PALETTES = [
  'bg-primary/10 text-primary border-primary/20',
  'bg-success/10 text-success border-success/20',
  'bg-surface-elevated text-text-primary border-border-custom',
  'bg-primary/15 text-primary border-primary/25',
];

export function getSuperinvestorAvatar(
  name: string,
  fundName?: string,
  slug?: string
): InvestorAvatarData {
  const trimmed = name.trim();
  const initials = getInitials(trimmed);

  // 1. Spółki korporacyjne
  if (KNOWN_CORP_LOGOS[trimmed]) {
    return {
      type: 'image',
      url: KNOWN_CORP_LOGOS[trimmed],
      initials,
      badgeClasses: 'bg-surface border-border-custom text-text-primary',
    };
  }

  // 2. Znani inwestorzy z portretem
  if (KNOWN_PORTRAITS[trimmed]) {
    return {
      type: 'image',
      url: KNOWN_PORTRAITS[trimmed],
      initials,
      badgeClasses: 'bg-surface-elevated border-border-custom text-text-primary',
    };
  }

  // 3. Fallback: elegancki inicjał z dedykowaną kolorystyką
  let hash = 0;
  const key = `${slug || ''}_${trimmed}_${fundName || ''}`;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  const colorIndex = Math.abs(hash) % BADGE_COLOR_PALETTES.length;

  return {
    type: 'initials',
    initials,
    badgeClasses: BADGE_COLOR_PALETTES[colorIndex],
  };
}
