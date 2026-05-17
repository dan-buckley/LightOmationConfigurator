import { api } from './client';
import type { ApiResult } from './client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SegmentConfigEntry {
  id: number;
  segment_index: number;
  name: string | null;
  start_led: number;
  stop_led: number;
}

export interface SegmentConfig {
  id: number;
  light_id: number;
  name: string;
  source_import_id: number | null;
  created_at: string;
  entries: SegmentConfigEntry[];
}

export interface SegmentConfigsPage {
  items: SegmentConfig[];
  total: number;
  page: number;
  page_size: number;
}

export interface SegmentConfigEntryIn {
  segment_index: number;
  name?: string | null;
  start_led: number;
  stop_led: number;
}

export interface SegmentConfigIn {
  name: string;
  entries: SegmentConfigEntryIn[];
}

export interface ScannedConfigEntry {
  segment_index: number;
  start_led: number;
  stop_led: number;
}

export interface ScannedConfig {
  name: string;
  entries: ScannedConfigEntry[];
  persisted: boolean;
  config_id: number | null;
}

export interface ScanResult {
  total_presets_scanned: number;
  unique_configs_found: number;
  new_configs_created: number;
  configs: ScannedConfig[];
}

// ---------------------------------------------------------------------------
// API functions
// The client unwraps body.data automatically, so T should be the inner type.
// List endpoints return PaginatedResponse → SegmentConfigsPage (no extra .data wrapper).
// Single-item endpoints return SuccessResponse → the client extracts .data.
// ---------------------------------------------------------------------------

export function listSegmentConfigs(lightId: number): Promise<ApiResult<SegmentConfigsPage>> {
  return api.get<SegmentConfigsPage>(`/lights/${lightId}/segment-configs`);
}

export function getSegmentConfig(lightId: number, configId: number): Promise<ApiResult<SegmentConfig>> {
  return api.get<SegmentConfig>(`/lights/${lightId}/segment-configs/${configId}`);
}

export function createSegmentConfig(lightId: number, body: SegmentConfigIn): Promise<ApiResult<SegmentConfig>> {
  return api.post<SegmentConfig>(`/lights/${lightId}/segment-configs`, body);
}

export function updateSegmentConfig(lightId: number, configId: number, body: SegmentConfigIn): Promise<ApiResult<SegmentConfig>> {
  return api.put<SegmentConfig>(`/lights/${lightId}/segment-configs/${configId}`, body);
}

export function deleteSegmentConfig(lightId: number, configId: number): Promise<ApiResult<void>> {
  return api.delete<void>(`/lights/${lightId}/segment-configs/${configId}`);
}

export function scanSegments(importId: number, apply = true): Promise<ApiResult<ScanResult>> {
  return api.post<ScanResult>(`/imports/${importId}/scan-segments`, { apply });
}
