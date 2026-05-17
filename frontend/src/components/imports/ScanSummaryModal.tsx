import { useEffect, useState } from 'react';
import { scanSegments } from '../../api/segmentConfigs';
import type { ScanResult } from '../../api/segmentConfigs';

interface ScanSummaryModalProps {
  importId: number;
  onClose: () => void;
}

export function ScanSummaryModal({ importId, onClose }: ScanSummaryModalProps) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scanSegments(importId, true).then((r) => {
      if (r.ok) {
        setResult(r.data);
      } else {
        setError(r.error.message);
      }
      setLoading(false);
    });
  }, [importId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Segment Config Scan</h2>
          <button
            className="text-gray-400 hover:text-gray-600 text-lg"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5">
          {loading && <p className="text-sm text-gray-500">Scanning presets.json…</p>}
          {error && (
            <div className="rounded bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {result && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-gray-800">{result.total_presets_scanned}</div>
                  <div className="text-xs text-gray-500 mt-0.5">presets scanned</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-blue-700">{result.unique_configs_found}</div>
                  <div className="text-xs text-blue-500 mt-0.5">unique configs</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-2xl font-bold text-green-700">{result.new_configs_created}</div>
                  <div className="text-xs text-green-500 mt-0.5">newly created</div>
                </div>
              </div>

              {result.configs.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Discovered Configurations
                  </h3>
                  {result.configs.map((cfg, i) => (
                    <div key={i} className="border border-gray-200 rounded-lg px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{cfg.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {cfg.entries.length} seg
                          </span>
                          {cfg.persisted ? (
                            <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded px-1.5 py-0.5">
                              {cfg.config_id ? `saved #${cfg.config_id}` : 'saved'}
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded px-1.5 py-0.5">
                              already exists
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {cfg.entries.map((e, j) => (
                          <span key={j} className="mr-2 font-mono">
                            [{e.start_led}–{e.stop_led}]
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {result.unique_configs_found === 0 && (
                <p className="text-sm text-gray-500 italic">
                  No segment data found in this presets.json. Presets may use the device's current
                  state rather than explicit segments.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-6 pb-5 flex justify-end">
          <button
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
