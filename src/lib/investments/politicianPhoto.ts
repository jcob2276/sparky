/**
 * politicianPhoto.ts — Pomocnik zdjęć polityków Kongresu USA.
 * Korzysta z oficjalnego repozytorium zdjęć członków Kongresu USA (unitedstates/images)
 * na podstawie Bioguide ID, ze słownikiem dla najpopularniejszych polityków.
 */

const KNOWN_BIOGUIDES: Record<string, string> = {
  'nancy pelosi': 'P000197',
  'scott h. peters': 'P000608',
  'scott peters': 'P000608',
  'john fetterman': 'F000479',
  'jarod moskowitz': 'M001217',
  'richard w. allen': 'A000372',
  'richard allen': 'A000372',
  'sheri biggs': 'B001321',
  'pete sessions': 'S000250',
  'dan sullivan': 'S001198',
  'thomas suozzi': 'S001201',
  'mitch mcconnell': 'M000355',
  'chuck schumer': 'S000148',
  'ted cruz': 'C001098',
  'bernie sanders': 'S000033',
  'alexandria ocasio-cortez': 'O000172',
  'marjorie taylor greene': 'G000596',
  'robert b. aderholt': 'A000055',
  'joe courtney': 'C001069',
  'kathy castor': 'C001066',
};

export function getPoliticianPhotoUrl(name: string, bioguideId?: string | null): string | null {
  const bio = bioguideId?.trim() || KNOWN_BIOGUIDES[name.toLowerCase().trim()];
  if (bio) {
    return `https://raw.githubusercontent.com/unitedstates/images/gh-pages/congress/225x275/${bio}.jpg`;
  }
  return null;
}
