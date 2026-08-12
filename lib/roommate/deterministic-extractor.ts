import { bioExtractionSchema, lifestyleExtractionSchema, moveInExtractionSchema } from './schemas';

export type ExtractionResult = { ok: true; value: Record<string, unknown>; provider: 'deterministic'; version: 'roommate-fallback-v1' } | { ok: false; reason: string; provider: 'deterministic'; version: 'roommate-fallback-v1' };

function isoDate(year: number, month: number, day: number) {
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day ? value.toISOString().slice(0, 10) : null;
}

export function extractMoveInTiming(text: string, now = new Date()): ExtractionResult {
  const normalized = text.toLowerCase();
  const numeric = normalized.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/);
  const months: Record<string, number> = { january:1, february:2, march:3, april:4, may:5, june:6, july:7, august:8, september:9, october:10, november:11, december:12, jan:1, feb:2, mar:3, apr:4, jun:6, jul:7, aug:8, sep:9, sept:9, oct:10, nov:11, dec:12 };
  const named = normalized.match(/\b(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?/);
  let date: string | null = null;
  if (numeric) date = isoDate(Number(numeric[1]), Number(numeric[2]), Number(numeric[3]));
  if (!date && named) { const month = months[named[1]]; let year = named[3] ? Number(named[3]) : now.getUTCFullYear(); if (!named[3] && month < now.getUTCMonth() + 1) year += 1; date = isoDate(year, month, Number(named[2])); }
  if (!date) return { ok: false, reason: 'Please choose a date or include a date such as September 1, 2026.', provider: 'deterministic', version: 'roommate-fallback-v1' };
  let before = 0; let after = 0;
  const earlier = normalized.match(/(\d+)\s*(day|days|week|weeks)\s*earlier/); if (earlier) before = Number(earlier[1]) * (earlier[2].startsWith('week') ? 7 : 1);
  const later = normalized.match(/(\d+)\s*(day|days|week|weeks)\s*later/); if (later) after = Number(later[1]) * (later[2].startsWith('week') ? 7 : 1);
  if (/a week earlier/.test(normalized)) before = 7; if (/a week later/.test(normalized)) after = 7;
  if (/plus or minus|±|either way/.test(normalized)) { const flex = normalized.match(/(\d+)\s*(day|days|week|weeks)/); const days = flex ? Number(flex[1]) * (flex[2].startsWith('week') ? 7 : 1) : 7; before = days; after = days; }
  const parsed = moveInExtractionSchema.safeParse({ moveInDate: date, flexibilityDaysBefore: before, flexibilityDaysAfter: after });
  return parsed.success ? { ok: true, value: parsed.data, provider: 'deterministic', version: 'roommate-fallback-v1' } : { ok: false, reason: 'I could not confirm that timing. Please use the date picker.', provider: 'deterministic', version: 'roommate-fallback-v1' };
}

export function extractLifestyle(text: string): ExtractionResult {
  const value: Record<string, unknown> = {}; const normalized = text.toLowerCase();
  if (/work from home|wfh|remote/.test(normalized)) value.workPattern = 'work_from_home'; else if (/hybrid|days? a week/.test(normalized)) value.workPattern = 'hybrid'; else if (/on.?site|in the office/.test(normalized)) value.workPattern = 'on_site';
  if (/quiet/.test(normalized)) value.noisePreference = 'quiet'; else if (/social|lively/.test(normalized)) value.noisePreference = 'social'; else if (/moderate/.test(normalized)) value.noisePreference = 'moderate';
  const sleep = normalized.match(/(?:sleep|bed|bedtime)\s+(?:around|at)?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/); if (sleep) value.sleepSchedule = `Usually sleeps around ${sleep[1].trim()}`;
  const parsed = lifestyleExtractionSchema.safeParse(value);
  return parsed.success && Object.keys(parsed.data).length ? { ok: true, value: parsed.data, provider: 'deterministic', version: 'roommate-fallback-v1' } : { ok: false, reason: 'I could not confidently extract those preferences. Please use the quick options.', provider: 'deterministic', version: 'roommate-fallback-v1' };
}

export function generateBio(text: string, tone: 'default' | 'warmer' | 'shorter' = 'default'): ExtractionResult {
  const clean = text.replace(/\s+/g, ' ').trim().slice(0, tone === 'shorter' ? 180 : 280);
  if (!clean) return { ok: false, reason: 'Add a few details about your routine or preferred home environment.', provider: 'deterministic', version: 'roommate-fallback-v1' };
  const bio = tone === 'warmer' ? `Hi! ${clean.replace(/^i\s+/i, 'I ')} I value clear communication and a comfortable shared home.` : clean;
  const parsed = bioExtractionSchema.safeParse({ bio });
  return parsed.success ? { ok: true, value: parsed.data, provider: 'deterministic', version: 'roommate-fallback-v1' } : { ok: false, reason: 'Please shorten the introduction to 300 characters.', provider: 'deterministic', version: 'roommate-fallback-v1' };
}

