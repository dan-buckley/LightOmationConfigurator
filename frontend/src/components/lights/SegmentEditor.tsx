import { useEffect, useState } from 'react';
import { checkCoverage, replaceSegments } from '../../api/lights';
import type { SegmentIn, SegmentOut } from '../../api/lights';
import { CoverageBar } from './CoverageBar';

interface EditableSegment extends SegmentIn {
  _key: number; // local identity for list rendering
}

interface SegmentEditorProps {
  lightId: number;
  totalLeds: number | null;
  initialSegments: SegmentOut[];
  onSaved: () => void;
}

let nextKey = 1;

function fromSegmentOut(segs: SegmentOut[]): EditableSegment[] {
  return segs.map((s) => ({
    _key: nextKey++,
    name: s.name,
    start_led: s.start_led,
    stop_led: s.stop_led,
  }));
}

export function SegmentEditor({ lightId, totalLeds, initialSegments, onSaved }: SegmentEditorProps) {
  const [segments, setSegments] = useState<EditableSegment[]>(() =>
    fromSegmentOut(initialSegments),
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedWarnings, setSavedWarnings] = useState<string[]>([]);

  useEffect(() => {
    setSegments(fromSegmentOut(initialSegments));
    setSavedWarnings([]);
    setSaveError(null);
  }, [lightId]);

  const coverageWarnings = checkCoverage(
    segments.map((s) => ({ start_led: s.start_led, stop_led: s.stop_led })),
    totalLeds,
  );

  function addSegment() {
    const last = segments[segments.length - 1];
    const start = last ? last.stop_led : 0;
    const stop = start + 10;
    setSegments((prev) => [
      ...prev,
      { _key: nextKey++, name: null, start_led: start, stop_led: stop },
    ]);
  }

  function removeSegment(key: number) {
    setSegments((prev) => prev.filter((s) => s._key !== key));
  }

  function updateSegment(key: number, field: keyof SegmentIn, rawValue: string) {
    setSegments((prev) =>
      prev.map((s) => {
        if (s._key !== key) return s;
        if (field === 'name') return { ...s, name: rawValue || null };
        const num = parseInt(rawValue, 10);
        return { ...s, [field]: isNaN(num) ? s[field] : num };
      }),
    );
  }

  async function handleSave() {
    // Validate: start_led < stop_led for each segment
    for (const seg of segments) {
      if (seg.start_led >= seg.stop_led) {
        setSaveError(`Segment "${seg.name ?? `#${segments.indexOf(seg) + 1}`}": start must be less than stop`);
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    setSavedWarnings([]);
    const payload: SegmentIn[] = segments.map(({ _key: _k, ...s }) => s);
    const result = await replaceSegments(lightId, payload);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error.message);
      return;
    }
    setSavedWarnings(result.data.warnings);
    onSaved();
  }

  const rowClass = 'grid grid-cols-[1fr_7rem_7rem_2.5rem] gap-2 items-center';

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className={`${rowClass} text-xs font-medium text-gray-500 uppercase tracking-wide`}>
        <span>Name</span>
        <span>Start LED</span>
        <span>Stop LED</span>
        <span />
      </div>

      {/* Segment rows */}
      {segments.length === 0 && (
        <div className="py-4 text-center text-sm text-gray-400">
          No segments — click "Add segment" to begin
        </div>
      )}
      {segments.map((seg, idx) => (
        <div key={seg._key} className={rowClass}>
          <input
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            placeholder={`Segment ${idx + 1}`}
            value={seg.name ?? ''}
            onChange={(e) => updateSegment(seg._key, 'name', e.target.value)}
          />
          <input
            type="number"
            min={0}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            value={seg.start_led}
            onChange={(e) => updateSegment(seg._key, 'start_led', e.target.value)}
          />
          <input
            type="number"
            min={1}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
            value={seg.stop_led}
            onChange={(e) => updateSegment(seg._key, 'stop_led', e.target.value)}
          />
          <button
            type="button"
            onClick={() => removeSegment(seg._key)}
            className="text-red-400 hover:text-red-600 font-bold text-lg leading-none"
            title="Remove segment"
          >
            ×
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addSegment}
        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
      >
        + Add segment
      </button>

      {/* Coverage visualisation */}
      <div className="pt-2">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          LED Coverage
        </div>
        <CoverageBar
          segments={segments.map((s) => ({
            start_led: s.start_led,
            stop_led: s.stop_led,
            name: s.name,
          }))}
          totalLeds={totalLeds}
        />
      </div>

      {/* Live coverage warnings */}
      {coverageWarnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 space-y-1">
          <div className="text-xs font-semibold text-amber-700">Coverage warnings</div>
          {coverageWarnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-700">
              {w}
            </div>
          ))}
          <div className="text-xs text-amber-600 pt-1">
            You can still save — warnings are informational.
          </div>
        </div>
      )}

      {/* Save-time warnings (from API) */}
      {savedWarnings.length > 0 && (
        <div className="rounded border border-amber-300 bg-amber-50 p-3 space-y-1">
          <div className="text-xs font-semibold text-amber-700">Saved with warnings</div>
          {savedWarnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-700">
              {w}
            </div>
          ))}
        </div>
      )}

      {saveError && (
        <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {saveError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save segments'}
        </button>
      </div>
    </div>
  );
}
