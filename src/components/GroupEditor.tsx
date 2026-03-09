import type { Hunt, Group, Room } from "../types";

interface GroupEditorProps {
  hunt: Hunt;
  updateHunt: (updater: (h: Hunt) => Hunt) => void;
  selectedGroupId: string | null;
  onSelectGroup: (id: string | null) => void;
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
}

const DEFAULT_ROOM: Room = { id: "r1", name: "Room 1", order: 0, clues: [] };

export default function GroupEditor({
  hunt,
  updateHunt,
  selectedGroupId,
  onSelectGroup,
  selectedRoomId,
  onSelectRoom,
}: GroupEditorProps) {
  const selectedGroup = selectedGroupId ? hunt.groups.find((g) => g.id === selectedGroupId) : null;
  const rooms = selectedGroup?.rooms ?? [];
  const sortedRooms = [...rooms].sort((a, b) => a.order - b.order);

  const addRoom = () => {
    if (!selectedGroupId) return;
    const maxOrder = rooms.length ? Math.max(...rooms.map((r) => r.order)) : -1;
    const id = `r${Date.now()}`;
    updateHunt((h) => ({
      ...h,
      groups: h.groups.map((g) =>
        g.id === selectedGroupId
          ? {
              ...g,
              rooms: [...g.rooms, { id, name: `Room ${g.rooms.length + 1}`, order: maxOrder + 1, clues: [] }],
            }
          : g
      ),
    }));
    onSelectRoom(id);
  };

  const updateRoom = (id: string, patch: Partial<Room>) => {
    if (!selectedGroupId) return;
    updateHunt((h) => ({
      ...h,
      groups: h.groups.map((g) =>
        g.id === selectedGroupId ? { ...g, rooms: g.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) } : g
      ),
    }));
  };

  const removeRoom = (id: string) => {
    if (!selectedGroupId || rooms.length <= 1) return;
    const fallbackRoom = sortedRooms.find((r) => r.id !== id);
    updateHunt((h) => ({
      ...h,
      groups: h.groups.map((g) =>
        g.id === selectedGroupId
          ? {
              ...g,
              rooms: g.rooms.filter((r) => r.id !== id),
              current_room_id: g.current_room_id === id ? fallbackRoom?.id ?? "r1" : g.current_room_id,
            }
          : g
      ),
    }));
    if (selectedRoomId === id) onSelectRoom(fallbackRoom?.id ?? null);
  };

  const addGroup = () => {
    const id = `g${Date.now()}`;
    const templateRooms = selectedGroup?.rooms?.length ? selectedGroup.rooms : [DEFAULT_ROOM];
    const newRooms = templateRooms.map((r, i) => ({
      ...r,
      id: i === 0 ? `r${Date.now()}` : `r${Date.now()}_${i}`,
      order: r.order,
      clues: [],
    }));
    const firstRoomId = newRooms[0]?.id ?? "r1";
    updateHunt((h) => ({
      ...h,
      groups: [
        ...h.groups,
        {
          id,
          name: `Group ${h.groups.length + 1}`,
          rooms: newRooms,
          clues: {},
          info_blocks: [],
          completed_clues: [],
          current_room_id: firstRoomId,
        },
      ],
    }));
    onSelectGroup(id);
    onSelectRoom(firstRoomId);
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
    if (selectedGroupId === id) {
      onSelectGroup(null);
      onSelectRoom(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 font-medium text-stone-700">Groups</h3>
        <p className="mb-3 text-xs text-stone-500">
          Groups are separate sets of people who progress through their own custom room sequence. Each
          group has its own rooms and clues. Select a group to edit its rooms.
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
              title={selectedGroupId === g.id ? "Deselect group" : "Select group to edit rooms and clues"}
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

      {selectedGroup && (
        <div>
          <h3 className="mb-2 font-medium text-stone-700">Rooms (for {selectedGroup.name})</h3>
          <p className="mb-3 text-xs text-stone-500">
            Rooms are phases this group progresses through. Each room has its own clues. Complete the
            room-exit clue to advance to the next room.
          </p>
          {sortedRooms.length === 0 ? (
            <p className="mb-2 text-sm text-stone-500">No rooms yet. Add one to get started.</p>
          ) : (
            sortedRooms.map((r) => (
              <div
                key={r.id}
                className={`mb-2 flex items-center gap-2 rounded border p-2 ${
                  selectedRoomId === r.id ? "border-amber-500 bg-amber-50" : "border-stone-200 bg-stone-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectRoom(selectedRoomId === r.id ? null : r.id)}
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                  title={selectedRoomId === r.id ? "Deselect room" : "Select room to edit clues"}
                  aria-pressed={selectedRoomId === r.id}
                >
                  {selectedRoomId === r.id ? (
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                  ) : (
                    <span className="h-2 w-2 rounded-full border-2 border-stone-400" />
                  )}
                </button>
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => updateRoom(r.id, { name: e.target.value })}
                  className="flex-1 rounded border border-stone-300 bg-white px-2 py-1 text-sm"
                />
                <button
                  onClick={() => removeRoom(r.id)}
                  disabled={rooms.length <= 1}
                  className="text-xs text-red-600 hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  Remove
                </button>
              </div>
            ))
          )}
          <button
            onClick={addRoom}
            className="rounded border border-dashed border-stone-300 px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100"
          >
            + Add room
          </button>
        </div>
      )}
    </div>
  );
}
