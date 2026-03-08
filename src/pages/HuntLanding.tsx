import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPlayerHunt } from "../api";

export default function HuntLanding() {
  const { prefix } = useParams<{ prefix: string }>();
  const navigate = useNavigate();
  const [groupId, setGroupId] = useState("");
  const [hunt, setHunt] = useState<{ name: string; groups: { id: string; name: string }[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!prefix) return;
    getPlayerHunt(prefix)
      .then(setHunt)
      .catch(() => setError("Hunt not found"));
  }, [prefix]);

  const handleStart = () => {
    if (!groupId.trim()) {
      setError("Select a group");
      return;
    }
    navigate(`/${prefix}/play/${groupId}`);
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!hunt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 p-8">
      <div className="w-full max-w-md rounded border border-stone-300 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-semibold text-stone-800">{hunt.name}</h1>
        <p className="mb-4 text-sm text-stone-500">Select your group to begin</p>
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="mb-4 w-full rounded border border-stone-300 px-3 py-2 text-sm"
        >
          <option value="">— Select group —</option>
          {hunt.groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        {hunt.groups.length === 0 && (
          <p className="mb-4 text-sm text-amber-600">
            No groups configured. Add groups in the builder first.
          </p>
        )}
        <button
          onClick={handleStart}
          disabled={!groupId}
          className="w-full rounded bg-stone-800 py-2 text-white hover:bg-stone-900 disabled:opacity-50"
        >
          Start hunt
        </button>
      </div>
    </div>
  );
}
