import type { ImportOut } from '../../api/imports';

interface ImportListProps {
  imports: ImportOut[];
  onViewRaw: (id: number) => void;
  onExtract: (id: number) => void;
}

const FILE_TYPE_BADGE: Record<string, string> = {
  presets: 'bg-purple-50 text-purple-700',
  cfg: 'bg-teal-50 text-teal-700',
};

const SOURCE_BADGE: Record<string, string> = {
  manual: 'bg-gray-100 text-gray-600',
  network: 'bg-blue-50 text-blue-700',
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function ImportList({ imports, onViewRaw, onExtract }: ImportListProps) {
  if (imports.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-500">No imports yet. Upload a file above.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Light</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Source</th>
            <th className="px-4 py-3 text-left font-medium text-gray-700">Imported</th>
            <th className="px-4 py-3 text-right font-medium text-gray-700">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {imports.map((imp) => (
            <tr key={imp.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{imp.light_name}</td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${FILE_TYPE_BADGE[imp.file_type] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {imp.file_type}.json
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE[imp.source] ?? 'bg-gray-100 text-gray-600'}`}
                >
                  {imp.source}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{fmt(imp.imported_at)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onViewRaw(imp.id)}
                    className="text-blue-600 hover:underline"
                  >
                    View JSON
                  </button>
                  {imp.file_type === 'cfg' && (
                    <button
                      onClick={() => onExtract(imp.id)}
                      className="text-teal-600 hover:underline"
                    >
                      Extract profile
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
