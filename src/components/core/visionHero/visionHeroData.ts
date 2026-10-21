import dreamBoardLandscape from '../../../assets/dream_board_landscape.webp';
import girlGoal from '../../../assets/girl_goal.webp';

const BORN = new Date('2002-07-06');

export function livedDays(): number {
  return Math.floor((Date.now() - BORN.getTime()) / 86400000);
}

export interface HeroImage {
  src: string;
  alt: string;
  title: string;
  objectPosition: string;
}

export const HERO_IMAGES: HeroImage[] = [
  { src: dreamBoardLandscape, alt: 'Mapa Marzeń — Wizja 6 Filarów', title: 'Wizja · 6 Filarów', objectPosition: 'object-center' },
  { src: girlGoal, alt: 'Cel', title: 'Cel', objectPosition: 'object-[center_25%]' },
];

