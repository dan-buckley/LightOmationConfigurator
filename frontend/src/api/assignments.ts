import { api } from './client';
import type { ApiResult } from './client';

export type ColourMode = 'source' | 'segment' | 'custom';

export interface Assignment {
  id: number;
  light_id: number;
  master_preset_id: number;
  preset_name: string;
  category_name: string | null;
  target_preset_id: number;
  target_quick_label: string | null;
  sort_order: number;
  colour_mode: ColourMode;
  palette_override: number | null;
  colour_slots: string | null;
  notes: string | null;
  slot_warning: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AssignmentIn {
  master_preset_id: number;
  target_preset_id: number;
  target_quick_label?: string | null;
  sort_order?: number | null;
  colour_mode?: ColourMode;
  palette_override?: number | null;
  colour_slots?: string | null;
  notes?: string | null;
}

export interface AssignmentUpdate {
  target_preset_id?: number;
  target_quick_label?: string | null;
  sort_order?: number;
  colour_mode?: ColourMode;
  palette_override?: number | null;
  colour_slots?: string | null;
  notes?: string | null;
}

export interface ReorderItem {
  id: number;
  sort_order: number;
}

const base = (lightId: number) => `/api/v1/lights/${lightId}/assignments`;

export function listAssignments(lightId: number): Promise<ApiResult<Assignment[]>> {
  return api.get<Assignment[]>(base(lightId));
}

export function addAssignment(lightId: number, body: AssignmentIn): Promise<ApiResult<Assignment>> {
  return api.post<Assignment>(base(lightId), body);
}

export function updateAssignment(
  lightId: number,
  assignmentId: number,
  body: AssignmentUpdate,
): Promise<ApiResult<Assignment>> {
  return api.put<Assignment>(`${base(lightId)}/${assignmentId}`, body);
}

export function deleteAssignment(
  lightId: number,
  assignmentId: number,
): Promise<ApiResult<{ deleted_id: number }>> {
  return api.delete(`${base(lightId)}/${assignmentId}`);
}

export function reorderAssignments(
  lightId: number,
  items: ReorderItem[],
): Promise<ApiResult<Assignment[]>> {
  return api.put<Assignment[]>(`${base(lightId)}/reorder`, items);
}
