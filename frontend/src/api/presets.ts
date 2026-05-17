import { api } from './client';
import type { ApiResult } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PresetCategory {
  id: number;
  name: string;
  description: string | null;
}

export interface MasterPreset {
  id: number;
  name: string;
  category_id: number | null;
  category_name: string | null;
  segment_config_id: number | null;
  preset_data: string;
  source_light_id: number | null;
  source_light_name: string | null;
  source_preset_id: number | null;
  segment_group_hint: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PresetsPage {
  items: MasterPreset[];
  total: number;
  page: number;
  page_size: number;
}

export interface MasterPresetIn {
  name: string;
  category_id?: number | null;
  segment_config_id?: number | null;
  preset_data: string;
  segment_group_hint?: string | null;
  notes?: string | null;
}

export interface MasterPresetUpdate {
  name?: string;
  category_id?: number | null;
  segment_config_id?: number | null;
  preset_data?: string;
  segment_group_hint?: string | null;
  notes?: string | null;
}

export interface BulkImportRequest {
  import_id: number;
  preset_ids: number[];
  category_id?: number | null;
  strip_prefix?: boolean;
}

export interface BulkImportResult {
  imported: number;
  skipped_duplicates: number;
  skipped_ids: number[];
  imported_preset_ids: number[];
}

export interface DeleteResult {
  assignment_count: number;
}

// ---------------------------------------------------------------------------
// API calls
// ---------------------------------------------------------------------------

export function listCategories(): Promise<ApiResult<PresetCategory[]>> {
  return api.get<PresetCategory[]>('/api/v1/presets/categories');
}

export function listPresets(
  params: { category_id?: number; search?: string; page?: number; page_size?: number } = {},
): Promise<ApiResult<PresetsPage>> {
  const qs = new URLSearchParams();
  if (params.category_id != null) qs.set('category_id', String(params.category_id));
  if (params.search) qs.set('search', params.search);
  if (params.page != null) qs.set('page', String(params.page));
  if (params.page_size != null) qs.set('page_size', String(params.page_size));
  const q = qs.toString();
  return api.get<PresetsPage>(`/api/v1/presets${q ? `?${q}` : ''}`);
}

export function getPreset(id: number): Promise<ApiResult<MasterPreset>> {
  return api.get<MasterPreset>(`/api/v1/presets/${id}`);
}

export function createPreset(body: MasterPresetIn): Promise<ApiResult<MasterPreset>> {
  return api.post<MasterPreset>('/api/v1/presets', body);
}

export function updatePreset(id: number, body: MasterPresetUpdate): Promise<ApiResult<MasterPreset>> {
  return api.put<MasterPreset>(`/api/v1/presets/${id}`, body);
}

export function deletePreset(id: number, force = false): Promise<ApiResult<DeleteResult>> {
  return api.delete<DeleteResult>(`/api/v1/presets/${id}${force ? '?force=true' : ''}`);
}

export function bulkImportPresets(body: BulkImportRequest): Promise<ApiResult<BulkImportResult>> {
  return api.post<BulkImportResult>('/api/v1/presets/bulk-import', body);
}
