export interface Project {
  id: string;
  org_id: string;
  name: string;
  description: string;
  source_language: string | null;
  target_languages: string[];
  settings: Record<string, unknown>;
  created_at: string;
}

export interface Asset {
  id: string;
  project_id: string;
  kind: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  duration_seconds: number | null;
  status: string;
  created_at: string;
}

export interface Stage {
  id: string;
  name: string;
  position: number;
  status: string;
  attempt: number;
  artifact_key: string | null;
  error: string | null;
  meta: Record<string, unknown>;
  started_at: string | null;
  finished_at: string | null;
}

export interface Run {
  id: string;
  project_id: string;
  asset_id: string;
  template: string;
  params: { target_languages?: string[]; styles?: Record<string, string> };
  status: string;
  error: string | null;
  credits_used: number;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  stages: Stage[];
}

export interface Segment {
  index: number;
  start: number;
  end: number;
  speaker: string | null;
  text: string;
  emotion?: string;
  edited?: boolean;
  translations: Record<string, { text: string; style: string | null; qe: number | null }>;
}

export interface Transcript {
  run_id: string;
  language: string;
  segments: Segment[];
  styles?: Record<string, string>;
}

export interface LanguageInfo {
  code: string;
  name: string;
  styleCount: number;
}

export interface Voice {
  id: string;
  name: string;
  kind: string;
  engine: string;
  category: string;
  language_coverage: string[];
  consent_status: string;
  created_at: string;
}

export interface Character {
  id: string;
  project_id: string;
  name: string;
  category: string;
  speaker_label: string | null;
  voice_id: string | null;
}
