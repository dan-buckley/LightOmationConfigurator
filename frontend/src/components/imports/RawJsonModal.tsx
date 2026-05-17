import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { getImport } from '../../api/imports';
import { ErrorMessage } from '../shared/ErrorMessage';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface RawJsonModalProps {
  importId: number;
  onClose: () => void;
}

export function RawJsonModal({ importId, onClose }: RawJsonModalProps) {
  const [raw, setRaw] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    getImport(importId).then((res) => {
      setLoading(false);
      if (!res.ok) { setError(res.error.message); return; }
      setTitle(`${res.data.light_name} — ${res.data.file_type}.json`);
      try {
        setRaw(JSON.stringify(JSON.parse(res.data.raw_json), null, 2));
      } catch {
        setRaw(res.data.raw_json);
      }
    });
  }, [importId]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-3xl flex-col rounded-lg bg-white shadow-xl"
        style={{ maxHeight: 'calc(100vh - 8rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">{title || 'Raw JSON'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {raw && (
            <pre className="whitespace-pre-wrap break-all rounded-md bg-gray-950 p-4 text-xs text-green-300">
              {raw}
            </pre>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
