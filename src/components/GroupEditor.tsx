import type { Hunt, Group } from "../types";

interface GroupEditorProps {
  hunt: Hunt;
  updateHunt: (updater: (h: Hunt) => Hunt) => void;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
}

export default function GroupEditor({ hunt, updateHunt, selectedGroupId, onSelectGroup }: GroupEditorProps) {
  const addGroup = () => {
    const id = `g${Date.now()}`;
    const room = hunt.rooms[0];
    updateHunt((h) => ({
      ...h,
      groups: [
        ...h.groups,
        {
          id,
          name: `Group ${h.groups.length + 1}`,
          clues: {},
          info_blocks: [],
          completed_clues: [],
          current_room_id: room?.id ?? "r1",
        },
      ],
    }));
    onSelectGroup(id);
  };

  const updateGroup = (id: string, patch: Partial<Group>) => {
    updateHunt((h) => ({
      ...h,
      groups: h.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    }));
  };

  const removeGroup = (id: string) => {
    updateHunt((h) => ({
      ...h,
      groups: h.groups.filter((g) => g.id !== id),
    }));
    if (selectedGroupId === id) onSelectGroup(null);
  };

  return (
    <div>
      <h3 className="mb-2 font-medium text-stone-700">Groups</h3>
      <p className="mb-3 text-xs text-stone-500">
        Groups are separate sets of people who will not be in the same physical place, but may
        require working together as a team to solve some clues. Each group has their own set of
        clues, and cannot see the other group&apos;s clues. Click on a group to see and edit its clues.
      </p>
      {hunt.groups.map((g) => (
        <div
          key={g.id}
          className={`mb-2 flex items-center gap-2 rounded border p-2 ${
            selectedGroupId === g.id ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-stone-50"
          }`}
        >
          <button
            type="button"
            onClick={() => onSelectGroup(selectedGroupId === g.id ? null : g.id)}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
            title={selectedGroupId === g.id ? "Deselect group" : "Select group to edit clues"}
            aria-pressed={selectedGroupId === g.id}
          >
            {selectedGroupId === g.id ? (
              <span className="h-2 w-2 rounded-full bg-amber-600" />
            ) : (
              <span className="h-2 w-2 rounded-full border-2 border-stone-400" />
            )}
          </button>
          <input
            type="text"
            value={g.name}
            onChange={(e) => updateGroup(g.id, { name: e.target.value })}
            className="flex-1 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
          />
          <a
            href={`/${hunt.prefix}/play/${g.id}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-stone-500 underline"
            onClick={(e) => e.stopPropagation()}
          >
            Play
          </a>
          <button
            onClick={() => removeGroup(g.id)}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ))}
      <button
        onClick={addGroup}
        className="rounded border border-dashed border-stone-300 px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
      >
        + Add group
      </button>
    </div>
  );
}
