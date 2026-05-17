import { useEffect, useState } from 'react';
import { createLight, getLight, updateLight } from '../../api/lights';
import type { LightIn, LightOut } from '../../api/lights';
import { SegmentConfigList } from './SegmentConfigList';
import { SegmentEditor } from './SegmentEditor';

interface LightFormProps {
  /** undefined = create mode */
  lightId?: number;
  onSaved: (id: number) => void;
  onCancel: () => void;
}

const EMPTY_FORM: LightIn = {
  name: '',
  ip_address: null,
  mdns: null,
  firmware_version: null,
  total_leds: 0,
  location: null,
  notes: null,
  light_type: 'strip',
  shortcode: null,
  preset_slot_scheme: null,
};

export function LightForm({ lightId, onSaved, onCancel }: LightFormProps) {
  const isEdit = lightId !== undefined;
  const [form, setForm] = useState<LightIn>(EMPTY_FORM);
  const [light, setLight] = useState<LightOut | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segmentsKey, setSegmentsKey] = useState(0); // bump to reload SegmentEditor

  useEffect(() => {
    if (!isEdit) return;
    setLoading(true);
    getLight(lightId).then((result) => {
      setLoading(false);
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const l = result.data;
      setLight(l);
      setForm({
        name: l.name,
        ip_address: l.ip_address,
        mdns: l.mdns,
        firmware_version: l.firmware_version,
        total_leds: l.total_leds ?? 0,
        location: l.location,
        notes: l.notes,
        light_type: l.light_type ?? 'strip',
        shortcode: l.shortcode,
        preset_slot_scheme: l.preset_slot_scheme,
      });
    });
  }, [lightId]);

  function set(field: keyof LightIn, value: string | number | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    if (!form.total_leds || form.total_leds <= 0) {
      setError('Total LEDs must be a positive number');
      return;
    }
    setSaving(true);
    setError(null);
    const result = isEdit
      ? await updateLight(lightId, form)
      : await createLight(form);
    setSaving(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onSaved(result.data.id);
  }

  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';
  const inputClass =
    'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

  if (loading) {
    return <div className="py-8 text-center text-gray-500 text-sm">Loading…</div>;
  }

  return (
    <div className="space-y-8">
      {/* Metadata form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Name */}
          <div>
            <label className={labelClass}>
              Name <span className="text-red-500">*</span>
            </label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              placeholder="e.g. Lightomation-RB-Proto"
              required
            />
          </div>

          {/* Total LEDs */}
          <div>
            <label className={labelClass}>
              Total LEDs <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.total_leds ?? ''}
              onChange={(e) => set('total_leds', parseInt(e.target.value, 10) || 0)}
              required
            />
          </div>

          {/* IP Address */}
          <div>
            <label className={labelClass}>IP Address</label>
            <input
              className={inputClass}
              value={form.ip_address ?? ''}
              onChange={(e) => set('ip_address', e.target.value || null)}
              placeholder="e.g. 192.168.1.100"
            />
          </div>

          {/* mDNS */}
          <div>
            <label className={labelClass}>mDNS</label>
            <input
              className={inputClass}
              value={form.mdns ?? ''}
              onChange={(e) => set('mdns', e.target.value || null)}
              placeholder="e.g. wled-proto.local"
            />
          </div>

          {/* Firmware Version */}
          <div>
            <label className={labelClass}>Firmware Version</label>
            <input
              className={inputClass}
              value={form.firmware_version ?? ''}
              onChange={(e) => set('firmware_version', e.target.value || null)}
              placeholder="e.g. 0.14.0"
            />
          </div>

          {/* Location */}
          <div>
            <label className={labelClass}>Location</label>
            <input
              className={inputClass}
              value={form.location ?? ''}
              onChange={(e) => set('location', e.target.value || null)}
              placeholder="e.g. Living room"
            />
          </div>

          {/* Light Type */}
          <div>
            <label className={labelClass}>Light Type</label>
            <select
              className={inputClass}
              value={form.light_type ?? 'strip'}
              onChange={(e) => set('light_type', e.target.value)}
            >
              <option value="strip">strip</option>
              <option value="matrix">matrix</option>
              <option value="multi_segment">multi_segment</option>
              <option value="composite">composite</option>
            </select>
          </div>

          {/* Shortcode */}
          <div>
            <label className={labelClass}>Shortcode</label>
            <input
              className={inputClass}
              value={form.shortcode ?? ''}
              onChange={(e) => set('shortcode', e.target.value || null)}
              placeholder="e.g. RB, DEE, SM"
              maxLength={5}
            />
          </div>
        </div>

        {/* Preset Slot Scheme */}
        <div>
          <label className={labelClass}>Preset Slot Scheme (JSON)</label>
          <textarea
            className={inputClass}
            rows={3}
            value={form.preset_slot_scheme ?? ''}
            onChange={(e) => set('preset_slot_scheme', e.target.value || null)}
            placeholder='{"fx": [1,30], "colour": [31,60]}'
          />
        </div>

        {/* Notes */}
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            className={inputClass}
            rows={2}
            value={form.notes ?? ''}
            onChange={(e) => set('notes', e.target.value || null)}
          />
        </div>

        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create light'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Segment editor — only in edit mode */}
      {isEdit && light && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-4 border-t pt-6">
            Reference Segments
          </h3>
          <SegmentEditor
            key={segmentsKey}
            lightId={lightId}
            totalLeds={form.total_leds || light.total_leds}
            initialSegments={light.segments}
            onSaved={() => {
              // Reload light data to sync segment list
              getLight(lightId).then((r) => {
                if (r.ok) setLight(r.data);
              });
              setSegmentsKey((k) => k + 1);
            }}
          />
        </div>
      )}

      {/* Segment configurations — only in edit mode */}
      {isEdit && (
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-1 border-t pt-6">
            Named Segment Configurations
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Different presets may use different segment layouts. These are discovered automatically
            from imported files.
          </p>
          <SegmentConfigList lightId={lightId} />
        </div>
      )}
    </div>
  );
}
