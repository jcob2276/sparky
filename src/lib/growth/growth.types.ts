export type LibraryItemType = 'book' | 'course' | 'article' | 'podcast' | 'video' | 'note' | 'experiment';
export type LibraryItemStatus = 'want_to_learn' | 'in_progress' | 'processed' | 'applied';

export interface LibraryItem {
  id: string;
  title: string;
  type: LibraryItemType;
  status: LibraryItemStatus;
  url?: string;
  note?: string;
  connectedProjectId?: string;
  createdAt: string;
}

export type PracticeCompetenceLevel = 'try' | 'can_do' | 'apply_regularly';

export interface PracticeEvidence {
  id: string;
  title: string;
  date: string;
  competenceLevel: PracticeCompetenceLevel;
  details: string;
  projectId?: string;
}

interface DevelopmentReview {
  learned: string;
  applied: string;
  results: string;
  abandoned?: string;
  nextPractice?: string;
  updatedAt?: string;
}

export interface VanguardIdentityData {
  user_id: string;
  development_theme: string | null;
  development_gap: string | null;
  current_role: string | null;
  developed_role: string | null;
  library_items: LibraryItem[] | null;
  practice_evidences: PracticeEvidence[] | null;
  development_review: DevelopmentReview | null;
  updated_at: string | null;
}

export interface GrowthTaskItem {
  id: string;
  title: string;
  project_id: string | null;
  status: string;
  due_date: string | null;
  priority: string | null;
}

export interface GrowthProjectItem {
  id: string;
  name: string;
  goal: string | null;
  pillar: string | null;
  status: string;
  deadline: string | null;
  openTasksCount: number;
}

export interface GrowthDashboardData {
  identity: VanguardIdentityData | null;
  projects: GrowthProjectItem[];
  tasks: GrowthTaskItem[];
  libraryItems: LibraryItem[];
  practiceEvidences: PracticeEvidence[];
}
