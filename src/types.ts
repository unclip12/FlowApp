export interface StudyLog {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  type: 'INITIAL' | 'REVISION';
}

export interface ToDoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface VideoResource {
  id: string;
  title: string;
  url: string;
}

export interface KnowledgeBaseEntry {
  pageNumber: string;
  topic: string;
  subject: string;
  system: string;
  ankiTotal: number;
  videoLinks: VideoResource[];
  tags: string[];
  notes: string;
}

export interface PlanLog {
    id: string;
    date: string;
    durationMinutes: number;
    notes?: string;
}

export interface StudyPlanItem {
  id: string;
  date: string;
  type: 'PAGE' | 'VIDEO';
  pageNumber: string;
  topic: string;
  videoUrl?: string;
  ankiCount?: number;
  estimatedMinutes: number;
  isCompleted: boolean;
  subTasks?: ToDoItem[]; 
  logs?: PlanLog[];
  totalMinutesSpent?: number; 
}

export interface StudySession {
  id: string;
  topic: string; 
  pageNumber: string; 
  category: string;
  system?: string;
  revisionIntervals: number[]; 
  currentIntervalIndex: number; 
  nextRevisionDate: string | null; 
  ankiDone: boolean; 
  ankiTotal?: number;
  ankiCovered?: number;
  history: StudyLog[];
  notes?: string;
  toDoList?: ToDoItem[];
  lastStudied: string; 
}

export enum FilterType {
  ALL = 'ALL',
  DUE_TODAY = 'DUE_TODAY',
  UPCOMING = 'UPCOMING',
  MASTERED = 'MASTERED'
}

export const CATEGORIES = ['Pathology', 'Physiology', 'Pharmacology', 'Microbiology', 'Immunology', 'Biochem', 'Anatomy', 'Public Health', 'Ethics', 'Other'];

export const SYSTEMS = [
  'General Principles',
  'Cardiovascular',
  'Respiratory',
  'Renal',
  'Gastrointestinal',
  'Hematology/Oncology',
  'Neurology',
  'Psychiatry',
  'Endocrine',
  'Reproductive',
  'Musculoskeletal',
  'Dermatology'
];

export const DEFAULT_INTERVALS = [24, 72, 168, 336];
