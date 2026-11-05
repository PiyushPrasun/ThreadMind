export interface Env {
  [key: string]: unknown;
  OPENROUTER_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  OPENROUTER_MODEL?: string;
  OPENROUTER_SITE_URL?: string;
  OPENROUTER_APP_NAME?: string;
  DAILY_GLOBAL_LIMIT?: string;
  DAILY_IP_LIMIT?: string;
}

export interface Digest {
  thread_id: number;
  title: string;
  tldr: string;
  tldr_comment_ids: number[];
  positions: { label: string; summary: string; comment_ids: number[] }[];
  strongest_objections: { objection: string; against: string; comment_ids: number[] }[];
  open_questions: { question: string; comment_ids: number[] }[];
  consensus: string | null;
  consensus_comment_ids: number[];
  suggested_takeaway: string;
  takeaway_comment_ids: number[];
  stats: { comments_analyzed: number; comments_total: number };
}

export interface HNItem {
  id: number;
  title?: string;
  text?: string;
  author?: string;
  points?: number;
  children?: HNItem[];
  type?: string;
  dead?: boolean;
  deleted?: boolean;
}
