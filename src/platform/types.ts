export type Mode = "live" | "demo";
export type Sentiment = "positive" | "neutral" | "negative" | "unscored";
export interface CivicEvent {
  seq: number;
  id: string;
  content: string;
  city: string;
  area: string;
  category: string;
  sentiment: Sentiment;
  source: string;
  source_url: string | null;
  news_meta: string | null;
  author_username: string | null;
  author_name: string | null;
  author_avatar: string | null;
  demo: number;
  created_at: string;
  received_at: string;
}
export interface Snapshot {
  summary: {
    total: number;
    sentimentTotal: number;
    negative: number;
    positive: number;
    neutral: number;
    cities: number;
    latest: string | null;
    perMinute: number;
  };
  events: CivicEvent[];
  categories: { name: string; total: number; negative: number }[];
  cities: { name: string; total: number; negative: number }[];
  trend: {
    bucket: string;
    total: number;
    negative: number;
    positive: number;
    neutral: number;
  }[];
  cursor: number;
  serverTime: string;
  mode: Mode;
}
export { districts } from '../../worker/locations.js';
import { districts } from '../../worker/locations.js';
export const cities: string[] = districts.map(d => d.name);
export const categories = [
  "Infrastructure",
  "Water",
  "Waste",
  "Transport",
  "Safety",
  "Parks",
  "Other",
];
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(12000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      data.error || "Unable to reach the platform. Please try again.",
    );
  }
  return response.json();
}

export interface FreeSource {
  id: string; name: string; kind: "conditions" | "news" | "social" | "hazards"; docs: string; description: string;
  status: string; everyMinutes: number; lastAttempt: string | null; lastSuccess: string | null; lastError: string | null;
  lastCount: number; nextAllowed: number;
  payload: null | { measuredAt?: string; values?: Record<string, number | null>; modeled?: boolean; scanned?: number; sampleSeconds?: number;
    hazards?: {id: string; title: string; date: string; url: string; distanceKm: number}[] };
  history: {time: string; temperature_2m?: number; pm2_5?: number}[];
}
export interface SourceStatus {
  free: FreeSource[];
  x: { status: string; ready: boolean; query: string; lastSuccess: string | null; lastError: string | null;
    cadenceMinutes: number; dailyPostLimit: number; reservedPosts: number; sampled: boolean };
}
