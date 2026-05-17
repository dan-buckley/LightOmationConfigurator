import { useEffect, useState } from 'react';
import {
  deleteSegmentConfig,
  detectColours,
  listSegmentConfigs,
  patchEntryColour,
} from '../../api/segmentConfigs';
import type { SegmentConfig } from '../../api/segmentConfigs';
import { SegmentGroupsPanel } from './SegmentGroupsPanel';

// ---------------------------------------------------------------------------
// Colour helpers — WLED stores "[R,G,B]" JSON; HTML color input uses #rrggbb
// ---------------------------------------------------------------------------

function rgbJsonToHex(colourJson: string): string {
  try {
    const [r, g, b] = JSON.parse(colourJson) as [number, number, number];
    return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
  } catch {
    return '#000000';
  }
}

function hexToRgbJson(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return JSON.stringify([r, g, b]);
}

interface SegmentConfigListProps {
  lightId: number;
  onRefreshNeeded?: () => void;
}

export function SegmentConfigList({ lightId, onRefreshNeeded }: SegmentConfigListProps) {
  const [configs, setConfigs] = useState<SegmentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [detectingImportId, setDetectingImportId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const result = await listSegmentConfigs(lightId);
    if (result.ok) {
      setConfigs(result.data.items);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [lightId]);

  async function handleDelete(configId: number, configName: string) {
    if (!confirm(`Delete config "${configName}"? This cannot be undone.`)) return;
    setDeletingId(configId);
    setDeleteError(null);
    const result = await deleteSegmentConfig(lightId, configId);
    setDeletingId(null);
    if (result.ok) {
      setConfigs((prev) => prev.filter((c) => c.id !== configId));
      onRefreshNeeded?.();
    } else {
      setDeleteError(result.error.message);
    }
  }

  async function handleDetectColours(configId: number, importId: number) {
    setDetectingImportId(importId);
    const result = await detectColours(importId);
    setDetectingImportId(null);
    if (result.ok) {
      // Reload configs to pick up updated colours
      load();
    }
  }

  async function handleColourChange(configId: number, entryId: number, hex: string) {
    const colour = hexToRgbJson(hex);
    // Optimistic update
    setConfigs((prev) =>
      prev.map((c) =>
        c.id === configId
          ? { ...c, entries: c.entries.map((e) => (e.id === entryId ? { ...e, colour } : e)) }
          : c
      )
    );
    await patchEntryColour(lightId, configId, entryId, colour);
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading segment configs…</p>;
  }

  if (error) {
    return (
      <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (configs.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">
        No segment configurations yet. Import a cfg.json and apply its profile, or import a
        presets.json and scan for configs.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {deleteError && (
        <div className="rounded bg-red-50 border border-red-200 p-2 text-sm text-red-700">
          {deleteError}
        </div>
      )}
      {configs.map((cfg) => (
        <div key={cfg.id} className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
            <div className="flex items-center gap-2">
              <button
                className="text-left font-medium text-gray-800 hover:text-blue-600"
                onClick={() => setExpandedId(expandedId === cfg.id ? null : cfg.id)}
              >
                {cfg.name}
              </button>
              <span className="text-xs text-gray-400">
                {cfg.entries.length} segment{cfg.entries.length !== 1 ? 's' : ''}
              </span>
              {cfg.source_import_id && (
                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">
                  from import #{cfg.source_import_id}
                </span>
              )}
            </div>
            <button
              className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40"
              disabled={deletingId === cfg.id}
              onClick={() => handleDelete(cfg.id, cfg.name)}
            >
              {deletingId === cfg.id ? 'Deleting…' : 'Delete'}
            </button>
          </div>

          {expandedId === cfg.id && (
            <div className="px-4 pb-4 pt-2">
              {/* Detect colours button */}
              {cfg.source_import_id && (
                <div className="mb-2 flex justify-end">
                  <button
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-40"
                    disabled={detectingImportId === cfg.source_import_id}
                    onClick={() => handleDetectColours(cfg.id, cfg.source_import_id!)}
                  >
                    {detectingImportId === cfg.source_import_id ? 'Detecting…' : '✦ Detect colours'}
                  </button>
                </div>
              )}

              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase tracking-wide">
                    <th className="py-1 pr-4">#</th>
                    <th className="py-1 pr-4">Name</th>
                    <th className="py-1 pr-4">Start LED</th>
                    <th className="py-1 pr-4">Stop LED</th>
                    {cfg.entries.some(e => e.start_y != null) && (
                      <th className="py-1 pr-4">Y Range</th>
                    )}
                    <th className="py-1 pr-4">Length</th>
                    <th className="py-1 pr-4">Colour</th>
                  </tr>
                </thead>
                <tbody>
                  {cfg.entries.map((e) => (
                    <tr key={e.id} className="border-t border-gray-100">
                      <td className="py-1.5 pr-4 text-gray-400">{e.segment_index}</td>
                      <td className="py-1.5 pr-4 text-gray-700">{e.name ?? '—'}</td>
                      <td className="py-1.5 pr-4 font-mono text-gray-700">{e.start_led}</td>
                      <td className="py-1.5 pr-4 font-mono text-gray-700">{e.stop_led}</td>
                      {cfg.entries.some(e => e.start_y != null) && (
                        <td className="py-1.5 pr-4 font-mono text-gray-500">
                          {e.start_y != null ? `${e.start_y}–${e.stop_y}` : '—'}
                        </td>
                      )}
                      <td className="py-1.5 pr-4 font-mono text-gray-500">
                        {e.stop_led - e.start_led}
                      </td>
                      <td className="py-1.5 pr-4">
                        <label className="cursor-pointer inline-flex items-center gap-1.5" title={e.colour ?? 'Set colour'}>
                          <span
                            className="inline-block w-4 h-4 rounded border border-gray-300"
                            style={{ backgroundColor: e.colour ? rgbJsonToHex(e.colour) : 'transparent' }}
                          />
                          <input
                            type="color"
                            className="sr-only"
                            value={e.colour ? rgbJsonToHex(e.colour) : '#000000'}
                            onChange={(ev) => handleColourChange(cfg.id, e.id, ev.target.value)}
                          />
                          {!e.colour && <span className="text-xs text-gray-300">—</span>}
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <SegmentGroupsPanel lightId={lightId} config={cfg} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
