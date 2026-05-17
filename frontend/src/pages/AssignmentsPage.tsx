import { useCallback, useEffect, useState } from 'react';
import {
  Assignment,
  AssignmentUpdate,
  ColourMode,
  addAssignment,
  deleteAssignment,
  listAssignments,
  reorderAssignments,
  updateAssignment,
} from '../api/assignments';
import { LightSummary, getLights } from '../api/lights';
import { MasterPreset, PresetCategory, listCategories, listPresets } from '../api/presets';
import { EmptyState } from '../components/shared/EmptyState';
import { PageLayout } from '../components/shared/PageLayout';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLOUR_MODE_LABELS: Record<ColourMode, string> = {
  source: 'Source',
  segment: 'Segment',
  custom: 'Custom',
};

// ---------------------------------------------------------------------------
// AddAssignmentPanel
// ---------------------------------------------------------------------------

interface AddPanelProps {
  lightId: number;
  onAdded: (a: Assignment) => void;
  onCancel: () => void;
}

function AddAssignmentPanel({ lightId, onAdded, onCancel }: AddPanelProps) {
  const [presets, setPresets] = useState<MasterPreset[]>([]);
  const [categories, setCategories] = useState<PresetCategory[]>([]);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [selected, setSelected] = useState<MasterPreset | null>(null);
  const [targetId, setTargetId] = useState('');
  const [quickLabel, setQuickLabel] = useState('');
  const [colourMode, setColourMode] = useState<ColourMode>('source');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listPresets({ page_size: 500 }).then((r) => {
      if (r.ok) setPresets(r.data.items);
    });
    listCategories().then((r) => {
      if (r.ok) setCategories(r.data);
    });
  }, []);

  const filtered = presets.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || String(p.category_id) === filterCat;
    return matchSearch && matchCat;
  });

  async function handleSave() {
    if (!selected) { setError('Select a preset.'); return; }
    const tid = parseInt(targetId, 10);
    if (!targetId || isNaN(tid)) { setError('Enter a valid target preset ID.'); return; }
    setSaving(true);
    setError('');
    const res = await addAssignment(lightId, {
      master_preset_id: selected.id,
      target_preset_id: tid,
      target_quick_label: quickLabel || null,
      colour_mode: colourMode,
      notes: notes || null,
    });
    setSaving(false);
    if (res.ok) {
      onAdded(res.data);
    } else {
      setError(res.error.message);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-800">Add assignment</h2>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      {!selected ? (
        <div className="flex flex-1 flex-col overflow-hidden p-4 gap-3">
          <input
            type="text"
            placeholder="Search presets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
          />
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
          </select>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-100 rounded border border-gray-100">
            {filtered.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">No presets found</p>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="flex w-full items-start justify-between px-3 py-2 text-left hover:bg-blue-50"
                >
                  <span className="text-sm font-medium text-gray-800">{p.name}</span>
                  {p.category_name && (
                    <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
                      {p.category_name}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="rounded bg-blue-50 px-3 py-2 text-sm">
            <span className="font-medium text-blue-700">{selected.name}</span>
            {selected.category_name && (
              <span className="ml-2 text-blue-500">({selected.category_name})</span>
            )}
            <button
              onClick={() => setSelected(null)}
              className="ml-auto block text-xs text-blue-400 hover:text-blue-600"
            >
              Change
            </button>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Target preset ID *</label>
            <input
              type="number"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
              placeholder="e.g. 110"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Quick label</label>
            <input
              type="text"
              value={quickLabel}
              onChange={(e) => setQuickLabel(e.target.value)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
              placeholder="e.g. 01"
              maxLength={4}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Colour mode</label>
            <select
              value={colourMode}
              onChange={(e) => setColourMode(e.target.value as ColourMode)}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            >
              {(Object.keys(COLOUR_MODE_LABELS) as ColourMode[]).map((m) => (
                <option key={m} value={m}>{COLOUR_MODE_LABELS[m]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add assignment'}
            </button>
            <button
              onClick={onCancel}
              className="rounded border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EditPanel
// ---------------------------------------------------------------------------

interface EditPanelProps {
  assignment: Assignment;
  onSaved: (a: Assignment) => void;
  onDeleted: (id: number) => void;
  onClose: () => void;
}

function EditPanel({ assignment, onSaved, onDeleted, onClose }: EditPanelProps) {
  const [targetId, setTargetId] = useState(String(assignment.target_preset_id));
  const [quickLabel, setQuickLabel] = useState(assignment.target_quick_label ?? '');
  const [colourMode, setColourMode] = useState<ColourMode>(assignment.colour_mode);
  const [paletteOverride, setPaletteOverride] = useState(
    assignment.palette_override != null ? String(assignment.palette_override) : '',
  );
  const [notes, setNotes] = useState(assignment.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    const tid = parseInt(targetId, 10);
    if (isNaN(tid)) { setError('Enter a valid target preset ID.'); return; }
    setSaving(true);
    setError('');
    const body: AssignmentUpdate = {
      target_preset_id: tid,
      target_quick_label: quickLabel || null,
      colour_mode: colourMode,
      palette_override: paletteOverride ? parseInt(paletteOverride, 10) : null,
      notes: notes || null,
    };
    const res = await updateAssignment(assignment.light_id, assignment.id, body);
    setSaving(false);
    if (res.ok) onSaved(res.data);
    else setError(res.error.message);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteAssignment(assignment.light_id, assignment.id);
    setDeleting(false);
    if (res.ok) onDeleted(assignment.id);
    else setError(res.error.message);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="truncate text-sm font-semibold text-gray-800">{assignment.preset_name}</h2>
        <button onClick={onClose} className="ml-2 shrink-0 text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        {assignment.slot_warning && (
          <div className="rounded bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
            ⚠ {assignment.slot_warning}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Target preset ID *</label>
          <input
            type="number"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Quick label</label>
          <input
            type="text"
            value={quickLabel}
            onChange={(e) => setQuickLabel(e.target.value)}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            maxLength={4}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Colour mode</label>
          <select
            value={colourMode}
            onChange={(e) => setColourMode(e.target.value as ColourMode)}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
          >
            {(Object.keys(COLOUR_MODE_LABELS) as ColourMode[]).map((m) => (
              <option key={m} value={m}>{COLOUR_MODE_LABELS[m]}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Palette override</label>
          <input
            type="number"
            value={paletteOverride}
            onChange={(e) => setPaletteOverride(e.target.value)}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
            placeholder="None"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded border border-gray-200 px-3 py-1.5 text-sm"
          />
        </div>

        <div className="text-xs text-gray-400">
          Source: {assignment.preset_name} · Category: {assignment.category_name ?? '—'}
        </div>

        {error && <p className="text-xs text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>

        {confirmDelete ? (
          <div className="rounded bg-red-50 p-3 text-sm">
            <p className="mb-2 text-red-700">Remove this assignment?</p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? 'Removing…' : 'Yes, remove'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded border border-gray-200 px-3 py-1 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
          >
            Remove assignment
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AssignmentsPage
// ---------------------------------------------------------------------------

export function AssignmentsPage() {
  const [lights, setLights] = useState<LightSummary[]>([]);
  const [selectedLightId, setSelectedLightId] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  // Load lights once
  useEffect(() => {
    getLights().then((r) => {
      if (r.ok) {
        setLights(r.data.items);
        if (r.data.items.length > 0) setSelectedLightId(r.data.items[0].id);
      }
    });
  }, []);

  // Load assignments when light changes
  const loadAssignments = useCallback(async (lightId: number) => {
    setLoading(true);
    setError('');
    const res = await listAssignments(lightId);
    setLoading(false);
    if (res.ok) setAssignments(res.data);
    else setError(res.error.message);
  }, []);

  useEffect(() => {
    if (selectedLightId != null) loadAssignments(selectedLightId);
  }, [selectedLightId, loadAssignments]);

  const editAssignment = assignments.find((a) => a.id === editId) ?? null;

  // Move an assignment up or down by swapping sort_order with its neighbour
  async function handleMove(index: number, direction: 'up' | 'down') {
    if (!selectedLightId) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= assignments.length) return;

    const items = assignments.map((a, i) => {
      if (i === index) return { id: a.id, sort_order: assignments[swapIndex].sort_order };
      if (i === swapIndex) return { id: a.id, sort_order: assignments[index].sort_order };
      return { id: a.id, sort_order: a.sort_order };
    });

    const res = await reorderAssignments(selectedLightId, items);
    if (res.ok) setAssignments(res.data);
  }

  function handleAdded(a: Assignment) {
    setShowAdd(false);
    setAssignments((prev) => [...prev, a].sort((x, y) => x.sort_order - y.sort_order));
  }

  function handleSaved(updated: Assignment) {
    setAssignments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a)),
    );
    setEditId(null);
  }

  function handleDeleted(id: number) {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
    setEditId(null);
  }

  const hasSidePanel = showAdd || editAssignment != null;

  return (
    <PageLayout title="Assignments">
      {/* Light selector */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-6 py-3">
        <label className="text-sm font-medium text-gray-600">Light:</label>
        {lights.length === 0 ? (
          <span className="text-sm text-gray-400">No lights configured</span>
        ) : (
          <select
            value={selectedLightId ?? ''}
            onChange={(e) => {
              setSelectedLightId(Number(e.target.value));
              setShowAdd(false);
              setEditId(null);
            }}
            className="rounded border border-gray-200 px-3 py-1.5 text-sm"
          >
            {lights.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
        
        <div className="ml-auto">
          {selectedLightId != null && (
            <button
              onClick={() => { setShowAdd(true); setEditId(null); }}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              + Add assignment
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main table */}
        <div className="flex-1 overflow-auto p-6">
          {selectedLightId == null ? (
            <EmptyState title="No lights yet" description="Add a light in the Lights page first" />
          ) : loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : assignments.length === 0 ? (
            <EmptyState
              title="No assignments yet"
              description="Click '+ Add assignment' to map a master preset to this light"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500">
                  <th className="pb-2 pr-3 w-16">Order</th>
                  <th className="pb-2 pr-3 w-16">Target ID</th>
                  <th className="pb-2 pr-3 w-16">Label</th>
                  <th className="pb-2 pr-3">Preset name</th>
                  <th className="pb-2 pr-3">Category</th>
                  <th className="pb-2 pr-3">Colour mode</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {assignments.map((a, idx) => (
                  <tr
                    key={a.id}
                    className={`cursor-pointer hover:bg-gray-50 ${editId === a.id ? 'bg-blue-50' : ''}`}
                    onClick={() => { setEditId(a.id); setShowAdd(false); }}
                  >
                    <td className="py-2 pr-3 text-gray-400">{a.sort_order}</td>
                    <td className="py-2 pr-3 font-mono font-medium text-gray-800">{a.target_preset_id}</td>
                    <td className="py-2 pr-3 font-mono text-gray-500">{a.target_quick_label ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <span className="font-medium text-gray-800">{a.preset_name}</span>
                      {a.slot_warning && (
                        <span className="ml-2 text-xs text-yellow-600">⚠</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {a.category_name ? (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600">
                          {a.category_name}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-500">{COLOUR_MODE_LABELS[a.colour_mode]}</td>
                    <td className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          disabled={idx === 0}
                          onClick={() => handleMove(idx, 'up')}
                          className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          disabled={idx === assignments.length - 1}
                          onClick={() => handleMove(idx, 'down')}
                          className="rounded px-1.5 py-0.5 text-xs text-gray-400 hover:bg-gray-200 disabled:opacity-30"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Side panel */}
        {hasSidePanel && (
          <div className="w-80 shrink-0 overflow-hidden border-l border-gray-200 bg-white">
            {showAdd && selectedLightId != null ? (
              <AddAssignmentPanel
                lightId={selectedLightId}
                onAdded={handleAdded}
                onCancel={() => setShowAdd(false)}
              />
            ) : editAssignment ? (
              <EditPanel
                key={editAssignment.id}
                assignment={editAssignment}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
                onClose={() => setEditId(null)}
              />
            ) : null}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

