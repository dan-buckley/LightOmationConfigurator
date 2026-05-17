import { useCallback, useEffect, useState } from 'react';

import { listImports } from '../api/imports';
import type { ImportOut } from '../api/imports';
import { ExtractProfileModal } from '../components/imports/ExtractProfileModal';
import { ImportForm } from '../components/imports/ImportForm';
import { ImportList } from '../components/imports/ImportList';
import { RawJsonModal } from '../components/imports/RawJsonModal';
import { ScanSummaryModal } from '../components/imports/ScanSummaryModal';
import { ErrorMessage } from '../components/shared/ErrorMessage';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { PageLayout } from '../components/shared/PageLayout';

export function ImportPage() {
  const [imports, setImports] = useState<ImportOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawModalId, setRawModalId] = useState<number | null>(null);
  const [extractModalId, setExtractModalId] = useState<number | null>(null);
  const [scanModalId, setScanModalId] = useState<number | null>(null);

  const loadImports = useCallback(async () => {
    setLoading(true);
    const res = await listImports();
    setLoading(false);
    if (!res.ok) { setError(res.error.message); return; }
    setImports(res.data.items);
  }, []);

  useEffect(() => { loadImports(); }, [loadImports]);

  return (
    <PageLayout title="Import">
      <div className="mx-auto max-w-4xl space-y-6">
        <ImportForm
          onUploaded={(record) => {
            setImports((prev) => [
              {
                id: record.id,
                light_id: record.light_id,
                light_name: record.light_name,
                file_type: record.file_type,
                source: record.source,
                imported_at: record.imported_at,
                notes: record.notes,
              },
              ...prev,
            ]);
            if (record.file_type === 'cfg') {
              setExtractModalId(record.id);
            } else if (record.file_type === 'presets') {
              setScanModalId(record.id);
            }
          }}
        />

        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Import history</h2>
          {loading && <LoadingSpinner />}
          {error && <ErrorMessage message={error} />}
          {!loading && !error && (
            <ImportList
              imports={imports}
              onViewRaw={setRawModalId}
              onExtract={setExtractModalId}
              onScan={setScanModalId}
            />
          )}
        </div>
      </div>

      {rawModalId !== null && (
        <RawJsonModal importId={rawModalId} onClose={() => setRawModalId(null)} />
      )}

      {extractModalId !== null && (
        <ExtractProfileModal
          importId={extractModalId}
          onClose={() => setExtractModalId(null)}
          onApplied={() => {
            setExtractModalId(null);
          }}
        />
      )}
      {scanModalId !== null && (
        <ScanSummaryModal importId={scanModalId} onClose={() => setScanModalId(null)} />
      )}
    </PageLayout>
  );
}
