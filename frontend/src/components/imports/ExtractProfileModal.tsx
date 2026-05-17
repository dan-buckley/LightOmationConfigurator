import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { extractProfile, getImport } from '../../api/imports';
import type { ExtractPreview, ImportDetail } from '../../api/imports';
import { ErrorMessage } from '../shared/ErrorMessage';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface ExtractProfileModalProps {
  importId: number;
  onClose: () => void;
  onApplied: () => void;
}

export function ExtractProfileModal({ importId, onClose, onApplied }: ExtractProfileModalProps) {
  const [imp, setImp] = useState<ImportDetail | null>(null);
  const [preview, setPreview] = useState<ExtractPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [impRes, previewRes] = await Promise.all([
        getImport(importId),
        extractProfile(importId, false),
      ]);
      setLoading(false);
      if (!impRes.ok) { setError(impRes.error.message); return; }
      if (!previewRes.ok) { setError(previewRes.error.message); return; }
      setImp(impRes.data);
      setPreview(previewRes.data);
    }
    load();
  }, [importId]);

  async function handleApply() {
    setApplying(true);
    setError(null);
    const res = await extractProfile(importId, true);
    setApplying(false);
    if (!res.ok) { setError(res.error.message); return; }
    onApplied();
  }

  const lightHasData = imp
    ? /* we don't have segment count here, so always show confirm on apply */ false
    : false;
  void lightHasData;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Extract profile from cfg.json</h2>
          {imp && (
            <p className="mt-0.5 text-sm text-gray-500">
              Light: <span className="font-medium text-gray-700">{imp.light_name}</span>
            </p>
          )}
        </div>

        <div className="px-6 py-4">
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}

          {preview && !loading && (
            <>
              <div className="mb-4 grid grid-cols-2 gap-4 rounded-md bg-gray-50 p-4 text-sm">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Total LEDs
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {preview.total_leds ?? '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Strips found
                  </p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">
                    {preview.segments.length}
                  </p>
                </div>
              </div>

              {preview.segments.length > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                    Segments to import
                  </p>
                  <ul className="divide-y divide-gray-100 rounded-md border border-gray-200 text-sm">
                    {preview.segments.map((seg, i) => (
                      <li key={i} className="flex items-center justify-between px-3 py-2">
                        <span className="font-medium text-gray-700">
                          {seg.name ?? `Segment ${i + 1}`}
                        </span>
                        <span className="text-gray-500">
                          LED {seg.start_led} – {seg.stop_led}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="mb-4 rounded-md bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                  <p className="font-medium">Warnings</p>
                  <ul className="mt-1 list-disc pl-4">
                    {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={confirmOverwrite}
                  onChange={(e) => setConfirmOverwrite(e.target.checked)}
                  className="rounded border-gray-300"
                />
                I understand this will overwrite the existing total LEDs and all segments for this
                light.
              </label>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={applying || loading || !preview || !confirmOverwrite}
            className="rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying ? 'Applying…' : 'Apply to light profile'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
