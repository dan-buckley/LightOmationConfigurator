import { api } from './client';
import type { ApiResult } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SegmentIn {
  name?: string | null;
  start_led: number;
  stop_led: number;
}

export interface SegmentOut {
  id: number;
  segment_index: number;
  name: string | null;
  start_led: number;
  stop_led: number;
}

export interface LightIn {
  name: string;
  ip_address?: string | null;
  mdns?: string | null;
  firmware_version?: string | null;
  total_leds: number;
  location?: string | null;
  notes?: string | null;
  light_type?: string;
  shortcode?: string | null;
  preset_slot_scheme?: string | null;
}

export interface LightOut {
  id: number;
  name: string;
  ip_address: string | null;
  mdns: string | null;
  firmware_version: string | null;
  total_leds: number | null;
  location: string | null;
  notes: string | null;
  light_type: string;
  shortcode: string | null;
  preset_slot_scheme: string | null;
  created_at: string;
  updated_at: string;
  segments: SegmentOut[];
  import_count: number;
  assignment_count: number;
  generated_file_count: number;
}

export interface LightSummary {
  id: number;
  name: string;
  ip_address: string | null;
  total_leds: number | null;
  light_type: string;
  segment_count: number;
}

export interface LightsPage {
  items: LightSummary[];
  total: number;
  page: number;
  page_size: number;
}

export interface SegmentsResult {
  segments: SegmentOut[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Coverage analysis (mirrors backend logic for real-time warnings)
// ---------------------------------------------------------------------------

export function checkCoverage(
  segments: Array<{ start_led: number; stop_led: number }>,
  totalLeds: number | null,
): string[] {
  const warnings: string[] = [];
  if (segments.length === 0) return warnings;
  const sorted = [...segments].sort((a, b) => a.start_led - b.start_led);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start_led < sorted[i - 1].stop_led) {
      warnings.push(
        `Overlap: segment starting at LED ${sorted[i].start_led} overlaps with previous (ends at ${sorted[i - 1].stop_led})`,
      );
    }
  }
  let cursor = 0;
  for (const seg of sorted) {
    if (seg.start_led > cursor) {
      warnings.push(`Gap: LEDs ${cursor}–${seg.start_led} not covered`);
    }
    cursor = Math.max(cursor, seg.stop_led);
  }
  if (totalLeds !== null && cursor < totalLeds) {
    warnings.push(`Gap: LEDs ${cursor}–${totalLeds} not covered`);
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export function getLights(): Promise<ApiResult<LightsPage>> {
  return api.get<LightsPage>('/api/v1/lights/');
}

export function getLight(id: number): Promise<ApiResult<LightOut>> {
  return api.get<LightOut>(`/api/v1/lights/${id}`);
}

export function createLight(data: LightIn): Promise<ApiResult<LightOut>> {
  return api.post<LightOut>('/api/v1/lights/', data);
}

export function updateLight(id: number, data: LightIn): Promise<ApiResult<LightOut>> {
  return api.put<LightOut>(`/api/v1/lights/${id}`, data);
}

export function deleteLight(id: number): Promise<ApiResult<{ deleted_id: number }>> {
  return api.delete<{ deleted_id: number }>(`/api/v1/lights/${id}`);
}

export function getSegments(lightId: number): Promise<ApiResult<SegmentOut[]>> {
  return api.get<SegmentOut[]>(`/api/v1/lights/${lightId}/segments`);
}

export function replaceSegments(
  lightId: number,
  segments: SegmentIn[],
): Promise<ApiResult<SegmentsResult>> {
  return api.put<SegmentsResult>(`/api/v1/lights/${lightId}/segments`, segments);
}
