import { useCallback, useEffect, useState } from 'react';

import {
  bulkImportPresets,
  createPreset,
  deletePreset,
  listCategories,
  listPresets,
  updatePreset,
} from '../api/presets';
import type { BulkImportResult, MasterPreset, MasterPresetIn, PresetCategory } from '../api/presets';
import { listImports } from '../api/imports';
import type { ImportOut } from '../api/imports';
import { ErrorMessage } from '../components/shared/ErrorMessage';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { PageLayout } from '../components/shared/PageLayout';

// ---------------------------------------------------------------------------
// Bulk Import Modal
// ---------------------------------------------------------------------------

interface BulkImportModalProps {
  categories: PresetCategory[];
  onClose: () => void;
  onDone: () => void;
}

function BulkImportModal({ categories, onClose, onDone }: BulkImportModalProps) {
  const [imports, setImports] = useState<ImportOut[]>([]);
  const [selectedImportId, setSelectedImportId] = useState<number | null>(null);
  const [rawPresets, setRawPresets] = useState<{ id: number; name: string }[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [stripPrefix, setStripPrefix] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listImports().then((res) => {
      if (res.ok) setImports(res.data.items.filter((i) => i.file_type === 'presets'));
    });
  }, []);

  function handleSelectImport(id: number) {
    setSelectedImportId(id);
    setRawPresets([]);
    setChecked(new Set());
    const imp = imports.find((i) => i.id === id);
    if (!imp) return;
    // Fetch raw to parse preset list
    import('../api/imports').then(({ getImport }) =>
      getImport(id).then((res) => {
        if (!res.ok) return;
        try {
          const raw = JSON.parse(res.data.raw_json);
          const list = Object.entries(raw)
            .filter(([k]) => !isNaN(Number(k)))
            .map(([k, v]) => ({
              id: Number(k),
              name: typeof (v as Record<string, unknown>).n === 'string'
                ? String((v as Record<string, unknown>).n)
                : `Preset ${k}`,
            }))
            .sort((a, b) => a.id - b.id);
          setRawPresets(list);
          setChecked(new Set(list.map((p) => p.id)));
        } catch {
          setRawPresets([]);
        }
      })
    );
  }

  async function handleImport() {
    if (!selectedImportId || checked.size === 0) return;
    setLoading(true);
    setError(null);
    const res = await bulkImportPresets({
      import_id: selectedImportId,
      preset_ids: [...checked],
      category_id: categoryId,
      strip_prefix: stripPrefix,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error.message); return; }
    setResult(res.data);
  }

  function toggleAll(val: boolean) {
    setChecked(val ? new Set(rawPresets.map((p) => p.id)) : new Set());
  }

  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-base font-semibold text-gray-900">Import complete</h2>
          <div className="space-y-1 text-sm text-gray-700">
            <p><span className="font-medium">{result.imported}</span> presets imported</p>
            <p><span className="font-medium">{result.skipped_duplicates}</span> duplicates skipped</p>
            {result.skipped_ids.length > 0 && (
              <p className="text-gray-400">Skipped IDs: {result.skipped_ids.join(', ')}</p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              onClick={() => { onDone(); onClose(); }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl" style={{ maxHeight: '90vh' }}>
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Bulk import from presets.json</h2>
        </div>
        <div className="flex-1 overflow-auto p-6 space-y-5">
          {error && <ErrorMessage message={error} />}

          {/* Step 1: pick import */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Source import</label>
            <select
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={selectedImportId ?? ''}
              onChange={(e) => handleSelectImport(Number(e.target.value))}
            >
              <option value="">— select a presets.json import —</option>
              {imports.map((i) => (
                <option key={i.id} value={i.id}>{i.light_name} — {new Date(i.imported_at).toLocaleDateString()}</option>
              ))}
            </select>
          </div>

          {/* Step 2: options */}
          {rawPresets.length > 0 && (
            <>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">Category (optional)</label>
                  <select
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    value={categoryId ?? ''}
                    onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
                  >
                    <option value="">— none —</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={stripPrefix}
                      onChange={(e) => setStripPrefix(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    Strip numeric prefix
                  </label>
                </div>
              </div>

              {/* Step 3: preset checklist */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Presets ({checked.size} / {rawPresets.length} selected)
                  </span>
                  <div className="flex gap-3 text-xs text-blue-600">
                    <button onClick={() => toggleAll(true)} className="hover:underline">All</button>
                    <button onClick={() => toggleAll(false)} className="hover:underline">None</button>
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto rounded-lg border border-gray-200">
                  {rawPresets.map((p) => (
                    <label key={p.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        checked={checked.has(p.id)}
                        onChange={(e) => {
                          const next = new Set(checked);
                          e.target.checked ? next.add(p.id) : next.delete(p.id);
                          setChecked(next);
                        }}
                      />
                      <span className="font-mono text-xs text-gray-400 w-6">{p.id}</span>
                      <span className="text-sm text-gray-800">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            disabled={loading || !selectedImportId || checked.size === 0}
            onClick={handleImport}
          >
            {loading ? 'Importing…' : `Import ${checked.size > 0 ? checked.size : ''} presets`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset Detail / Edit panel
// ---------------------------------------------------------------------------

interface DetailPanelProps {
  preset: MasterPreset;
  categories: PresetCategory[];
  onClose: () => void;
  onSaved: (p: MasterPreset) => void;
  onDeleted: (id: number) => void;
}

function DetailPanel({ preset, categories, onClose, onSaved, onDeleted }: DetailPanelProps) {
  const [name, setName] = useState(preset.name);
  const [categoryId, setCategoryId] = useState<number | null>(preset.category_id);
  const [segmentGroupHint, setSegmentGroupHint] = useState(preset.segment_group_hint ?? '');
  const [notes, setNotes] = useState(preset.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    const res = await updatePreset(preset.id, {
      name: name.trim() || preset.name,
      category_id: categoryId,
      segment_group_hint: segmentGroupHint.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (!res.ok) { setError(res.error.message); return; }
    onSaved(res.data);
  }

  async function handleDelete(force: boolean) {
    setDeleting(true);
    setError(null);
    const res = await deletePreset(preset.id, force);
    setDeleting(false);
    if (!res.ok) {
      if (res.status === 409) {
        setConfirmDelete(true);
        return;
      }
      setError(res.error.message);
      return;
    }
    onDeleted(preset.id);
  }

  return (
    <div className="flex h-full flex-col border-l border-gray-200 bg-white" style={{ width: 360 }}>
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <span className="text-sm font-semibold text-gray-900 truncate pr-2">{preset.name}</span>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && <ErrorMessage message={error} />}

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Category</label>
          <select
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Segment group hint</label>
          <input
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="e.g. Hearts"
            value={segmentGroupHint}
            onChange={(e) => setSegmentGroupHint(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-400">Used by transposition engine for composite lights</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500 uppercase tracking-wide">Notes</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="text-xs text-gray-400 space-y-0.5">
          {preset.source_light_name && (
            <p>Source: {preset.source_light_name} #{preset.source_preset_id}</p>
          )}
          <p>Created: {new Date(preset.created_at).toLocaleString()}</p>
          <p>Updated: {new Date(preset.updated_at).toLocaleString()}</p>
        </div>

        <div>
          <button
            className="text-xs text-gray-400 hover:text-gray-600"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? '▲ Hide raw JSON' : '▼ Show raw JSON'}
          </button>
          {showRaw && (
            <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-700 border border-gray-200">
              {(() => { try { return JSON.stringify(JSON.parse(preset.preset_data), null, 2); } catch { return preset.preset_data; } })()}
            </pre>
          )}
        </div>

        {confirmDelete && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p className="font-medium mb-2">This preset has assignments. Delete anyway?</p>
            <div className="flex gap-2">
              <button
                className="rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
                disabled={deleting}
                onClick={() => handleDelete(true)}
              >
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                className="rounded border border-gray-300 px-3 py-1 text-xs text-gray-600 hover:bg-gray-50"
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
        <button
          className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
          disabled={deleting || confirmDelete}
          onClick={() => handleDelete(false)}
        >
          Delete
        </button>
        <button
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Preset Form
// ---------------------------------------------------------------------------

interface NewPresetFormProps {
  categories: PresetCategory[];
  onCreated: (p: MasterPreset) => void;
  onCancel: () => void;
}

function NewPresetForm({ categories, onCreated, onCancel }: NewPresetFormProps) {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [presetData, setPresetData] = useState('{}');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const body: MasterPresetIn = {
      name: name.trim(),
      category_id: categoryId,
      preset_data: presetData.trim() || '{}',
      notes: notes.trim() || null,
    };
    const res = await createPreset(body);
    setSaving(false);
    if (!res.ok) { setError(res.error.message); return; }
    onCreated(res.data);
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
      <h3 className="text-sm font-semibold text-gray-900">New preset</h3>
      {error && <ErrorMessage message={error} />}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Name</label>
          <input
            autoFocus
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Effect name (no prefix)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Category</label>
          <select
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={categoryId ?? ''}
            onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">— none —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">Notes</label>
          <input
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Raw preset JSON</label>
          <textarea
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
            rows={4}
            value={presetData}
            onChange={(e) => setPresetData(e.target.value)}
          />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
          onClick={onCancel}
        >Cancel</button>
        <button
          className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          disabled={saving || !name.trim()}
          onClick={handleCreate}
        >
          {saving ? 'Creating…' : 'Create'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function PresetsPage() {
  const [presets, setPresets] = useState<MasterPreset[]>([]);
  const [categories, setCategories] = useState<PresetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  const loadPresets = useCallback(async () => {
    setLoading(true);
    const res = await listPresets({
      search: search || undefined,
      category_id: filterCategory ?? undefined,
      page_size: 200,
    });
    setLoading(false);
    if (!res.ok) { setError(res.error.message); return; }
    setPresets(res.data.items);
  }, [search, filterCategory]);

  useEffect(() => {
    listCategories().then((res) => { if (res.ok) setCategories(res.data); });
  }, []);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  const selectedPreset = presets.find((p) => p.id === selectedId) ?? null;

  return (
    <PageLayout
      title="Preset Library"
      actions={
        <div className="flex gap-2">
          <button
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => setShowBulkImport(true)}
          >
            Bulk import
          </button>
          <button
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => { setShowNewForm(true); setSelectedId(null); }}
          >
            + New preset
          </button>
        </div>
      }
    >
      <div className="flex h-full gap-4">
        {/* Left: list */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Filters */}
          <div className="mb-4 flex gap-3">
            <input
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Search presets…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              value={filterCategory ?? ''}
              onChange={(e) => setFilterCategory(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {showNewForm && (
            <div className="mb-4">
              <NewPresetForm
                categories={categories}
                onCreated={(p) => {
                  setPresets((prev) => [p, ...prev]);
                  setShowNewForm(false);
                  setSelectedId(p.id);
                }}
                onCancel={() => setShowNewForm(false)}
              />
            </div>
          )}

          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {!loading && !error && presets.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              No presets yet — import from a presets.json or create one manually.
            </div>
          )}
          {!loading && presets.length > 0 && (
            <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Source light</th>
                    <th className="px-4 py-3 text-left">Group hint</th>
                  </tr>
                </thead>
                <tbody>
                  {presets.map((p) => (
                    <tr
                      key={p.id}
                      className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-blue-50 ${selectedId === p.id ? 'bg-blue-50' : ''}`}
                      onClick={() => { setSelectedId(p.id); setShowNewForm(false); }}
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {p.category_name
                          ? <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{p.category_name}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.source_light_name ?? <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-3 text-gray-500">{p.segment_group_hint ?? <span className="text-gray-300">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">
                {presets.length} preset{presets.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Right: detail panel */}
        {selectedPreset && (
          <DetailPanel
            preset={selectedPreset}
            categories={categories}
            onClose={() => setSelectedId(null)}
            onSaved={(updated) => setPresets((prev) => prev.map((p) => p.id === updated.id ? updated : p))}
            onDeleted={(id) => { setPresets((prev) => prev.filter((p) => p.id !== id)); setSelectedId(null); }}
          />
        )}
      </div>

      {showBulkImport && (
        <BulkImportModal
          categories={categories}
          onClose={() => setShowBulkImport(false)}
          onDone={loadPresets}
        />
      )}
    </PageLayout>
  );
}
