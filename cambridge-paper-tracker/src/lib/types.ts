export type SessionCode = 'mj' | 'on' | string;

export interface Subject {
  id: number;
  name: string;
  code: string;
  description?: string | null;
  qualification_name?: string | null;
  qualification_short_name?: string | null;
  paper_count?: number;
  verified_count?: number;
}

export interface PaperVariant {
  id: number;
  variant?: number;
  variant_number?: number;
  variant_verified?: number;
  component_code?: string;
  paper_number: number;
  paper_type?: string;
  version?: number | null;
  paper_label?: string | null;
  component_title?: string | null;
  component_verified?: number;
  year: number;
  session: SessionCode;
  series_code?: string;
  session_verified?: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  qualification_name?: string;
  qualification_short_name?: string;
  question_paper_url?: string | null;
  mark_scheme_url?: string | null;
  examiner_report_url?: string | null;
  completed?: number;
  completed_at?: string | null;
  verified?: number;
}

export interface Filters {
  qualifications: string[];
  subjects: { id: number; name: string; code: string; qualification: string }[];
  years: number[];
  sessions: string[];
  paperNumbers: number[];
  variants: number[];
  paperTypes: string[];
  verificationStatuses: string[];
  resourceTypes: string[];
}

export interface PapersResponse {
  papers: PaperVariant[];
  total: number;
  page: number;
  limit: number;
}

export interface StatSubject {
  name: string;
  code: string;
  qualification: string;
  total: number;
  completed_count: number;
  ignored_count: number;
}

export interface RecentPaper {
  id: number;
  subject_id: number;
  year: number;
  session: SessionCode;
  paper_number: number;
  variant_number?: number;
  component_code: string;
  series_code?: string;
  subject_name: string;
  subject_code: string;
  completed_at: string;
}

export interface IgnoredPaper {
  variant_id: number;
  subject_id: number;
  year: number;
  session: SessionCode;
  paper_number: number;
  variant_number?: number;
  component_code: string;
  series_code?: string;
  subject_name: string;
  subject_code: string;
  ignored_at: string;
}

export interface Stats {
  total: number;
  completed: number;
  ignored: number;
  remaining: number;
  percentage: number;
  bySubject: StatSubject[];
  recent: RecentPaper[];
  ignoredPapers: IgnoredPaper[];
}

export interface SubjectDetailResponse {
  subject: Subject & {
    qualification_id?: number;
    qualification_name?: string;
    qualification_short_name?: string;
  };
  papers: PaperVariant[];
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
  grouped: GroupedPapers;
  paperTypes: string[];
}

export interface PaperGroup {
  paper_type?: string;
  paper_label?: string | null;
  component_code?: string;
  verified?: number;
  variants: PaperVariant[];
}

// Year -> session (mj/on) -> paper_number -> PaperGroup
export type GroupedPapers = Record<string, Record<string, Record<string, PaperGroup>>>;

export interface PaperDetailResponse {
  variant: PaperVariant;
  resources: PaperResource[];
  progress: { id: number; completed: number; ignored: number; completed_at?: string } | null;
}

export interface PaperResource {
  id: number;
  resource_type: string;
  title?: string;
  url: string;
  provider?: string;
  verified?: number;
  source?: string;
  source_url?: string;
}

export interface ProgressEntry {
  variant_id: number;
  completed: number;
  ignored: number;
  completed_at?: string | null;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  isAdmin: boolean;
  profilePicture?: string | null;
  onboarding_completed?: boolean;
  show_only_selected_subjects?: boolean;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface UserPreferences {
  onboarding_completed: boolean;
  show_only_selected_subjects: boolean;
  preferences_updated_at: string | null;
  subject_ids: number[];
  subjects: Subject[];
}

export interface ToggleResponse {
  completed?: boolean;
  ignored?: boolean;
  completedAt?: string | null;
}
