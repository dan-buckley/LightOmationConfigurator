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
  start_y: number | null;
  stop_y: number | null;
  colour: string | null;
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
  start_y: number | null;
  stop_y: number | null;
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
// Groups
// ---------------------------------------------------------------------------

export interface SegmentGroupMember {
  id: number;
  group_id: number;
  entry_id: number;
}

export interface SegmentGroup {
  id: number;
  config_id: number;
  name: string;
  description: string | null;
  display_order: number;
  members: SegmentGroupMember[];
}

export interface SegmentGroupsPage {
  items: SegmentGroup[];
  total: number;
  page: number;
  page_size: number;
}

export interface SegmentGroupIn {
  name: string;
  description?: string | null;
  display_order?: number;
}

export interface GroupMembersIn {
  entry_ids: number[];
}

export interface EntryColourIn {
  colour: string | null;
}

export interface DetectColoursResult {
  entries_updated: number;
  colours_by_index: Record<number, string>;
}

// ---------------------------------------------------------------------------
// API functions
// The client unwraps body.data automatically, so T should be the inner type.
// List endpoints return PaginatedResponse → SegmentConfigsPage (no extra .data wrapper).
// Single-item endpoints return SuccessResponse → the client extracts .data.
// ---------------------------------------------------------------------------

export function listSegmentConfigs(lightId: number): Promise<ApiResult<SegmentConfigsPage>> {
  return api.get<SegmentConfigsPage>(`/api/v1/lights/${lightId}/segment-configs`);
}

export function getSegmentConfig(lightId: number, configId: number): Promise<ApiResult<SegmentConfig>> {
  return api.get<SegmentConfig>(`/api/v1/lights/${lightId}/segment-configs/${configId}`);
}

export function createSegmentConfig(lightId: number, body: SegmentConfigIn): Promise<ApiResult<SegmentConfig>> {
  return api.post<SegmentConfig>(`/api/v1/lights/${lightId}/segment-configs`, body);
}

export function updateSegmentConfig(lightId: number, configId: number, body: SegmentConfigIn): Promise<ApiResult<SegmentConfig>> {
  return api.put<SegmentConfig>(`/api/v1/lights/${lightId}/segment-configs/${configId}`, body);
}

export function deleteSegmentConfig(lightId: number, configId: number): Promise<ApiResult<void>> {
  return api.delete<void>(`/api/v1/lights/${lightId}/segment-configs/${configId}`);
}

export function scanSegments(importId: number, apply = true): Promise<ApiResult<ScanResult>> {
  return api.post<ScanResult>(`/api/v1/imports/${importId}/scan-segments`, { apply });
}

// ---------------------------------------------------------------------------
// Group API
// ---------------------------------------------------------------------------

export function listGroups(lightId: number, configId: number): Promise<ApiResult<SegmentGroupsPage>> {
  return api.get<SegmentGroupsPage>(`/api/v1/lights/${lightId}/segment-configs/${configId}/groups`);
}

export function createGroup(lightId: number, configId: number, body: SegmentGroupIn): Promise<ApiResult<SegmentGroup>> {
  return api.post<SegmentGroup>(`/api/v1/lights/${lightId}/segment-configs/${configId}/groups`, body);
}

export function updateGroup(lightId: number, configId: number, groupId: number, body: SegmentGroupIn): Promise<ApiResult<SegmentGroup>> {
  return api.put<SegmentGroup>(`/api/v1/lights/${lightId}/segment-configs/${configId}/groups/${groupId}`, body);
}

export function deleteGroup(lightId: number, configId: number, groupId: number): Promise<ApiResult<void>> {
  return api.delete<void>(`/api/v1/lights/${lightId}/segment-configs/${configId}/groups/${groupId}`);
}

export function replaceGroupMembers(lightId: number, configId: number, groupId: number, entryIds: number[]): Promise<ApiResult<SegmentGroup>> {
  return api.put<SegmentGroup>(`/api/v1/lights/${lightId}/segment-configs/${configId}/groups/${groupId}/members`, { entry_ids: entryIds });
}

export function patchEntryColour(lightId: number, configId: number, entryId: number, colour: string | null): Promise<ApiResult<SegmentConfigEntry>> {
  return api.patch<SegmentConfigEntry>(`/api/v1/lights/${lightId}/segment-configs/${configId}/entries/${entryId}/colour`, { colour });
}

export function detectColours(importId: number): Promise<ApiResult<DetectColoursResult>> {
  return api.post<DetectColoursResult>(`/api/v1/imports/${importId}/detect-colours`, {});
}
