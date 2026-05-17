import { useEffect, useRef, useState } from 'react';

import { getLights } from '../../api/lights';
import type { LightSummary } from '../../api/lights';
import { uploadImport } from '../../api/imports';
import type { ImportDetail } from '../../api/imports';
import { ErrorMessage } from '../shared/ErrorMessage';

interface ImportFormProps {
  onUploaded: (record: ImportDetail) => void;
}

export function ImportForm({ onUploaded }: ImportFormProps) {
  const [lights, setLights] = useState<LightSummary[]>([]);
  const [lightId, setLightId] = useState<number | ''>('');
  const [fileType, setFileType] = useState<'presets' | 'cfg'>('presets');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getLights().then((res) => {
      if (res.ok) setLights(res.data.items);
    });
  }, []);

  const lightRequired = fileType === 'presets';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if ((lightRequired && lightId === '') || !file) return;
    setSubmitting(true);
    setError(null);
    setNotice(null);
    const resolvedLightId = lightId === '' ? null : Number(lightId);
    const res = await uploadImport(resolvedLightId, fileType, file);
    setSubmitting(false);
    if (!res.ok) {
      setError(res.error.message);
      return;
    }
    if (res.data.light_created) {
      setNotice(`New light "${res.data.light_name}" created from this file`);
    }
    // reset
    setFile(null);
    if (fileRef.current) fileRef.current.value = '';
    onUploaded(res.data);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="mb-4 text-base font-semibold text-gray-900">Upload file</h2>

      {error && <div className="mb-4"><ErrorMessage message={error} /></div>}

      {notice && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">
          {notice}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Light{!lightRequired && <span className="ml-1 font-normal text-gray-400">(optional for cfg)</span>}
          </label>
          <select
            value={lightId}
            onChange={(e) => setLightId(e.target.value === '' ? '' : Number(e.target.value))}
            required={lightRequired}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">
              {lightRequired ? 'Select a light…' : 'Leave blank to create from file…'}
            </option>
            {lights.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          {!lightRequired && (
            <p className="mt-1 text-xs text-gray-500">
              If left blank, a new light will be created using the name from the cfg file.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">File type</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value as 'presets' | 'cfg')}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="presets">presets.json</option>
            <option value="cfg">cfg.json</option>
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">JSON file</label>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="submit"
          disabled={submitting || (lightRequired && lightId === '') || !file}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  );
}

