import { useEffect, useState } from 'react';
import { deleteLight, getLights } from '../../api/lights';
import type { LightOut, LightSummary } from '../../api/lights';
import { ConfirmModal } from '../shared/ConfirmModal';
import { ErrorMessage } from '../shared/ErrorMessage';
import { LoadingSpinner } from '../shared/LoadingSpinner';

interface LightListProps {
  onNew: () => void;
  onEdit: (id: number) => void;
  /** Called after a successful delete to allow parent to refresh counts */
  onDeleted?: () => void;
  /** If provided, used to build the delete confirmation message */
  loadLightDetail?: (id: number) => Promise<LightOut | null>;
}

export function LightList({ onNew, onEdit }: LightListProps) {
  const [lights, setLights] = useState<LightSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Delete confirmation state
  const [pendingDelete, setPendingDelete] = useState<LightSummary | null>(null);
  const [deleteMsg, setDeleteMsg] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function fetchLights() {
    setLoading(true);
    const result = await getLights();
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setLights(result.data.items);
  }

  useEffect(() => {
    fetchLights();
  }, []);

  function requestDelete(light: LightSummary) {
    setPendingDelete(light);
    setDeleteMsg(
      `Delete "${light.name}"? This will also remove its ${light.segment_count} segment(s) and any associated import history, assignments, and generated files.`,
    );
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await deleteLight(pendingDelete.id);
    setDeleting(false);
    setPendingDelete(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setLights((prev) => prev.filter((l) => l.id !== pendingDelete.id));
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{lights.length} light(s)</p>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
        >
          + New light
        </button>
      </div>

      {lights.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No lights yet — click "New light" to add one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-right">Total LEDs</th>
                <th className="px-4 py-3 text-right">Segments</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lights.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <button
                      onClick={() => onEdit(l.id)}
                      className="text-blue-600 hover:underline"
                    >
                      {l.name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {l.ip_address ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {l.total_leds ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{l.segment_count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => onEdit(l.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => requestDelete(l)}
                        className="text-red-500 hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          title={`Delete "${pendingDelete.name}"?`}
          message={deleteMsg}
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
