import { api } from './client';
import type { ApiResult } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImportOut {
  id: number;
  light_id: number;
  light_name: string;
  file_type: 'presets' | 'cfg';
  source: 'manual' | 'network';
  imported_at: string;
  notes: string | null;
}

export interface ImportDetail extends ImportOut {
  raw_json: string;
  light_created: boolean;
}

export interface ImportsPage {
  items: ImportOut[];
  total: number;
  page: number;
  page_size: number;
}

export interface ExtractedSegment {
  name: string | null;
  start_led: number;
  stop_led: number;
}

export interface ExtractPreview {
  total_leds: number | null;
  segments: ExtractedSegment[];
  applied: boolean;
  warnings: string[];
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export function uploadImport(
  lightId: number | null,
  fileType: 'presets' | 'cfg',
  file: File,
): Promise<ApiResult<ImportDetail>> {
  const form = new FormData();
  if (lightId != null) form.append('light_id', String(lightId));
  form.append('file_type', fileType);
  form.append('file', file);
  return api.upload<ImportDetail>('/api/v1/imports/upload', form);
}

export function listImports(lightId?: number): Promise<ApiResult<ImportsPage>> {
  const qs = lightId != null ? `?light_id=${lightId}` : '';
  return api.get<ImportsPage>(`/api/v1/imports/${qs}`);
}

export function getImport(id: number): Promise<ApiResult<ImportDetail>> {
  return api.get<ImportDetail>(`/api/v1/imports/${id}`);
}

export function extractProfile(
  importId: number,
  apply: boolean,
): Promise<ApiResult<ExtractPreview>> {
  return api.post<ExtractPreview>(`/api/v1/imports/${importId}/extract-profile`, { apply });
}
