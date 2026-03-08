import { useState } from "react";
import { getHunt, saveHunt, uploadImage } from "../api";
import type { Hunt, Clue } from "../types";
import GraphEditor from "../components/GraphEditor";
import ClueEditor from "../components/ClueEditor";
import GroupEditor from "../components/GroupEditor";

const DEFAULT_HUNT: Hunt = {
  id: "",
  prefix: "",
  name: "",
  rooms: [],
  groups: [],
};

export default function Builder() {
  const [prefix, setPrefix] = useState("");
  const [prefixInput, setPrefixInput] = useState("");
  const [hunt, setHunt] = useState<Hunt>(DEFAULT_HUNT);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedClueId, setSelectedClueId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadHunt = async (p: string) => {
    if (!p.trim()) return;
    try {
      const h = await getHunt(p);
      setHunt(h);
      setPrefix(p);
      // Auto-select first group so clues load into the editor
      if (h.groups?.length) {
        setSelectedGroupId(h.groups[0].id);
      } else {
        setSelectedGroupId(null);
      }
      setSelectedClueId(null);
      setSelectedEdgeId(null);
    } catch {
      setHunt({
        ...DEFAULT_HUNT,
        id: crypto.randomUUID(),
        prefix: p,
        name: "",
        rooms: [{ id: "r1", name: "Room 1", order: 0, clues: [] }],
        groups: [],
      });
      setPrefix(p);
      setSelectedGroupId(null);
      setSelectedClueId(null);
      setSelectedEdgeId(null);
    }
  };

  const handleLoad = () => {
    setError("");
    loadHunt(prefixInput.trim());
  };

  const handleSave = async () => {
    if (!prefix) return;
    setSaving(true);
    setError("");
    try {
      await saveHunt(prefix, hunt);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  };

  const updateHunt = (updater: (h: Hunt) => Hunt) => {
    setHunt(updater);
  };

  const selectedGroup = selectedGroupId ? hunt.groups.find((g) => g.id === selectedGroupId) : null;
  const clues = selectedGroup?.clues ?? {};
  const selectedClue = selectedClueId ? clues[selectedClueId] : null;

  const updateGroupClues = (updater: (clues: Record<string, Clue>) => Record<string, Clue>) => {
    if (!selectedGroupId) return;
    updateHunt((h) => ({
      ...h,
      groups: h.groups.map((g) =>
        g.id === selectedGroupId ? { ...g, clues: updater(g.clues) } : g
      ),
    }));
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b border-stone-300 bg-white px-4 py-3">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">Scavenger Hunt Builder</h1>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Hunt prefix (e.g. myhunt)"
              value={prefixInput}
              onChange={(e) => setPrefixInput(e.target.value)}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={handleLoad}
              className="rounded bg-stone-700 px-4 py-1.5 text-sm text-white hover:bg-stone-800"
            >
              Load
            </button>
          </div>
          {prefix && (
            <>
              <span className="text-stone-500">|</span>
              <input
                type="text"
                value={hunt.name}
                onChange={(e) => updateHunt((h) => ({ ...h, name: e.target.value }))}
                className="rounded border border-stone-300 px-3 py-1.5 text-sm"
                placeholder="Hunt title"
              />
              <a
                href={`/${prefix}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-stone-600 underline"
              >
                Play: /{prefix}
              </a>
              <button
                onClick={handleSave}
                disabled={saving || !hunt.name.trim()}
                title={!hunt.name.trim() ? "Enter a hunt title to save" : undefined}
                className="rounded bg-stone-700 px-4 py-1.5 text-sm text-white hover:bg-stone-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </header>

      {!prefix ? (
        <main className="flex flex-col items-center justify-center gap-4 p-12">
          <p className="text-stone-600">Enter a hunt prefix to create or edit a hunt.</p>
          <p className="text-sm text-stone-500">
            Players will access it at <code className="rounded bg-stone-200 px-1">/prefix</code>
          </p>
        </main>
      ) : (
        <main className="flex h-[calc(100vh-56px)]">
          <div className="flex-1 border-r border-stone-300">
            <GraphEditor
              clues={clues}
              rooms={hunt.rooms}
              selectedGroupId={selectedGroupId}
              updateGroupClues={updateGroupClues}
              selectedClueId={selectedClueId}
              onSelectClue={setSelectedClueId}
              selectedEdgeId={selectedEdgeId}
              onSelectEdge={setSelectedEdgeId}
              onUploadImage={(file) => uploadImage(prefix, file)}
            />
          </div>
          <aside className="w-96 overflow-y-auto bg-white">
            {selectedClue ? (
              <ClueEditor
                key={selectedClue.id}
                clue={selectedClue}
                hunt={hunt}
                onChange={(c) =>
                  updateGroupClues((clues) => ({ ...clues, [c.id]: c }))
                }
                onClose={() => setSelectedClueId(null)}
                imageUrl={(key) => `/api/builder/hunts/${prefix}/images/${key}`}
                onUploadImage={(file) => uploadImage(prefix, file)}
                onRoomExitChange={(clueId, roomId, isExit) => {
                  updateGroupClues((clues) => {
                    const c = clues[clueId];
                    if (!c) return clues;
                    return { ...clues, [clueId]: { ...c, is_room_exit: isExit } };
                  });
                  updateHunt((h) => ({
                    ...h,
                    rooms: h.rooms.map((r) => ({
                      ...r,
                      exit_clue_id:
                        isExit && r.id === roomId
                          ? clueId
                          : r.exit_clue_id === clueId
                            ? undefined
                            : r.exit_clue_id,
                    })),
                  }));
                }}
              />
            ) : selectedEdgeId ? (
              <EdgeDetailPane
                edgeId={selectedEdgeId}
                clues={clues}
                onRemove={() => {
                  const parts = selectedEdgeId.split("-");
                  const tgt = parts.pop();
                  const src = parts.length ? parts.join("-") : null;
                  if (src && tgt && clues[tgt]) {
                    const deps = clues[tgt].dependencies.filter((d) => d !== src);
                    updateGroupClues((c) => ({
                      ...c,
                      [tgt]: { ...c[tgt], dependencies: deps },
                    }));
                  }
                  setSelectedEdgeId(null);
                }}
                onClose={() => setSelectedEdgeId(null)}
              />
            ) : (
              <div className="space-y-6 p-4">
                <GroupEditor
                  hunt={hunt}
                  updateHunt={updateHunt}
                  selectedGroupId={selectedGroupId}
                  onSelectGroup={setSelectedGroupId}
                />
                <p className="text-sm text-stone-500">
                  {selectedGroupId
                    ? "Click a node to edit a clue, or an edge to see the dependency."
                    : "Select a group to edit its clues."}
                </p>
              </div>
            )}
          </aside>
        </main>
      )}
    </div>
  );
}

function EdgeDetailPane({
  edgeId,
  clues,
  onRemove,
  onClose,
}: {
  edgeId: string;
  clues: Record<string, Clue>;
  onRemove: () => void;
  onClose: () => void;
}) {
  const parts = edgeId.split("-");
  const tgt = parts.pop();
  const src = parts.join("-");
  const sourceClue = src ? clues[src] : null;
  const targetClue = tgt ? clues[tgt] : null;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">Connection</h2>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
          ✕
        </button>
      </div>
      <div className="rounded border border-stone-200 bg-stone-50 p-3">
        <p className="text-sm text-stone-700">
          <strong>{targetClue?.name ?? tgt}</strong> depends on{" "}
          <strong>{sourceClue?.name ?? src}</strong>
        </p>
        <p className="mt-1 text-xs text-stone-500">
          The target clue unlocks after the source is completed.
        </p>
        <button
          onClick={onRemove}
          className="mt-3 text-sm text-red-600 hover:underline"
        >
          Remove dependency
        </button>
      </div>
    </div>
  );
}
