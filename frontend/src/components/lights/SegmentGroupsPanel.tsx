import { useEffect, useState } from 'react';
import {
  createGroup,
  deleteGroup,
  listGroups,
  replaceGroupMembers,
  updateGroup,
} from '../../api/segmentConfigs';
import type { SegmentConfig, SegmentGroup } from '../../api/segmentConfigs';

interface Props {
  lightId: number;
  config: SegmentConfig;
}

export function SegmentGroupsPanel({ lightId, config }: Props) {
  const [groups, setGroups] = useState<SegmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Rename state: groupId -> draft name
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Member edit state
  const [memberEditId, setMemberEditId] = useState<number | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set());

  async function load() {
    setLoading(true);
    const result = await listGroups(lightId, config.id);
    if (result.ok) {
      setGroups(result.data.items);
    } else {
      setError(result.error.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [lightId, config.id]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    const result = await createGroup(lightId, config.id, { name });
    if (result.ok) {
      setGroups((prev) => [...prev, result.data]);
      setNewName('');
    } else {
      setError(result.error.message);
    }
    setCreating(false);
  }

  async function handleDelete(group: SegmentGroup) {
    if (!confirm(`Delete group "${group.name}"? Member assignments will be removed.`)) return;
    const result = await deleteGroup(lightId, config.id, group.id);
    if (result.ok) {
      setGroups((prev) => prev.filter((g) => g.id !== group.id));
    }
  }

  async function handleRenameSubmit(groupId: number) {
    const name = renameDraft.trim();
    if (!name) return;
    const result = await updateGroup(lightId, config.id, groupId, { name });
    if (result.ok) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? result.data : g)));
      setRenamingId(null);
    } else {
      setError(result.error.message);
    }
  }

  function openMemberEdit(group: SegmentGroup) {
    setMemberEditId(group.id);
    setPendingIds(new Set(group.members.map((m) => m.entry_id)));
  }

  async function saveMemberEdit(groupId: number) {
    const result = await replaceGroupMembers(lightId, config.id, groupId, [...pendingIds]);
    if (result.ok) {
      setGroups((prev) => prev.map((g) => (g.id === groupId ? result.data : g)));
      setMemberEditId(null);
    } else {
      setError(result.error.message);
    }
  }

  if (loading) {
    return (
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-400">Loading groups…</p>
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Groups</p>

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {groups.length === 0 && (
        <p className="text-xs text-gray-400 italic mb-2">
          No groups. Groups let you target subsets of segments for transposition.
        </p>
      )}

      <div className="space-y-2 mb-3">
        {groups.map((group) => (
          <div key={group.id} className="border border-gray-200 rounded p-2 bg-gray-50 text-sm">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              {renamingId === group.id ? (
                <div className="flex gap-1 items-center flex-1 min-w-0">
                  <input
                    className="border border-gray-300 rounded px-2 py-0.5 text-sm flex-1 min-w-0"
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(group.id);
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    autoFocus
                  />
                  <button
                    className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
                    onClick={() => handleRenameSubmit(group.id)}
                  >
                    Save
                  </button>
                  <button
                    className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
                    onClick={() => setRenamingId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <span className="font-medium text-gray-800 truncate">{group.name}</span>
              )}
              <div className="flex gap-2 text-xs shrink-0">
                {renamingId !== group.id && (
                  <button
                    className="text-gray-400 hover:text-blue-600"
                    onClick={() => { setRenamingId(group.id); setRenameDraft(group.name); }}
                  >
                    Rename
                  </button>
                )}
                <button
                  className="text-gray-400 hover:text-blue-600"
                  onClick={() => openMemberEdit(group)}
                >
                  Members
                </button>
                <button
                  className="text-gray-400 hover:text-red-600"
                  onClick={() => handleDelete(group)}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Member edit panel */}
            {memberEditId === group.id ? (
              <div className="mt-2">
                <p className="text-xs text-gray-500 mb-1">Select member entries:</p>
                <div className="space-y-1">
                  {config.entries.map((entry) => (
                    <label key={entry.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={pendingIds.has(entry.id)}
                        onChange={(e) => {
                          const next = new Set(pendingIds);
                          if (e.target.checked) next.add(entry.id);
                          else next.delete(entry.id);
                          setPendingIds(next);
                        }}
                      />
                      <span className="font-mono text-gray-700">
                        #{entry.segment_index} {entry.name ?? ''} ({entry.start_led}–{entry.stop_led})
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    className="text-xs bg-blue-600 text-white rounded px-2 py-0.5 hover:bg-blue-700"
                    onClick={() => saveMemberEdit(group.id)}
                  >
                    Save
                  </button>
                  <button
                    className="text-xs text-gray-500 hover:text-gray-700"
                    onClick={() => setMemberEditId(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Member chips */
              <div className="mt-1.5 flex flex-wrap gap-1">
                {group.members.length === 0 ? (
                  <span className="text-xs text-gray-400 italic">No members yet</span>
                ) : (
                  group.members.map((m) => {
                    const entry = config.entries.find((e) => e.id === m.entry_id);
                    return entry ? (
                      <span
                        key={m.id}
                        className="text-xs bg-white border border-gray-300 rounded px-1.5 py-0.5 font-mono text-gray-700"
                      >
                        {entry.name ?? `seg${entry.segment_index}`}
                      </span>
                    ) : null;
                  })
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add group */}
      <div className="flex gap-2">
        <input
          className="border border-gray-300 rounded px-2 py-1 text-sm flex-1"
          placeholder="New group name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          className="text-xs bg-gray-700 text-white rounded px-3 py-1 hover:bg-gray-800 disabled:opacity-40"
          disabled={creating || !newName.trim()}
          onClick={handleCreate}
        >
          Add group
        </button>
      </div>
    </div>
  );
}
