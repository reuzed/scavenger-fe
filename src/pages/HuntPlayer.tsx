import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  getPlayerHunt,
  getGroupClues,
  getCompletedClues,
  submitAnswer,
  getGroupStats,
  imageUrl,
} from "../api";
import type { Clue, Hunt, InfoBlock } from "../types";

export default function HuntPlayer() {
  const { prefix, groupId } = useParams<{ prefix: string; groupId: string }>();
  const [hunt, setHunt] = useState<Hunt | null>(null);
  const [availableClues, setAvailableClues] = useState<Clue[]>([]);
  const [completedClues, setCompletedClues] = useState<Clue[]>([]);
  const [openClueId, setOpenClueId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getGroupStats>> | null>(null);

  const refresh = useCallback(async () => {
    if (!prefix || !groupId) return;
    const [h, avail, done] = await Promise.all([
      getPlayerHunt(prefix),
      getGroupClues(prefix, groupId),
      getCompletedClues(prefix, groupId),
    ]);
    setHunt(h);
    setAvailableClues(avail);
    setCompletedClues(done);
  }, [prefix, groupId]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  const handleSubmit = async (clueId: string) => {
    if (!prefix || !groupId || !answer.trim()) return;
    setMessage(null);
    try {
      const res = await submitAnswer(prefix, groupId, clueId, answer.trim());
      setMessage({ text: res.message, ok: res.correct });
      if (res.correct) {
        setAnswer("");
        setOpenClueId(null);
        refresh();
      }
    } catch (e) {
      setMessage({ text: String(e), ok: false });
    }
  };

  const loadStats = async () => {
    if (!prefix || !groupId) return;
    const s = await getGroupStats(prefix, groupId);
    setStats(s);
    setShowStats(true);
  };

  const openClue = openClueId ? availableClues.find((c) => c.id === openClueId) : null;

  const group = hunt?.groups.find((g) => g.id === groupId);
  const completedSet = new Set(completedClues.map((c) => c.id));
  const visibleInfoBlocks: InfoBlock[] = (group?.info_blocks ?? []).filter(
    (ib) => ib.visible_from_start || ib.dependencies.every((d) => completedSet.has(d))
  );

  if (!hunt || !prefix || !groupId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b border-stone-300 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">{hunt.name}</h1>
          <div className="flex gap-2">
            <button
              onClick={loadStats}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              Stats
            </button>
            <a
              href={`/${prefix}`}
              className="rounded border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50"
            >
              Exit
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-4">
        {/* Info blocks - generic + revealed */}
        {visibleInfoBlocks.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-stone-600">Info</h2>
            <div className="space-y-2">
              {visibleInfoBlocks.map((ib) => (
                <details
                  key={ib.id}
                  className="rounded border border-stone-200 bg-white"
                >
                  <summary className="cursor-pointer px-3 py-2 font-medium">
                    {ib.name || "Info"}
                  </summary>
                  <div className="border-t border-stone-100 px-3 py-2">
                    {ib.text && <p className="mb-2 text-sm text-stone-700">{ib.text}</p>}
                    {ib.image_keys.map((key) => (
                      <img
                        key={key}
                        src={imageUrl(prefix, key)}
                        alt=""
                        className="mt-1 max-h-40 rounded object-contain"
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* Completed clues - easy to review */}
        {completedClues.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-stone-600">Completed clues</h2>
            <div className="space-y-2">
              {completedClues.map((c) => (
                <details
                  key={c.id}
                  className="rounded border border-stone-200 bg-white"
                >
                  <summary className="cursor-pointer px-3 py-2 font-medium">
                    {c.name}
                  </summary>
                  <div className="border-t border-stone-100 px-3 py-2">
                    {c.text && <p className="mb-2 text-sm text-stone-700">{c.text}</p>}
                    {c.image_keys.map((key) => (
                      <img
                        key={key}
                        src={imageUrl(prefix, key)}
                        alt=""
                        className="mt-1 max-h-40 rounded object-contain"
                      />
                    ))}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* New clues feed */}
        <section>
          <h2 className="mb-2 text-sm font-medium text-stone-600">Available clues</h2>
          {availableClues.length === 0 ? (
            <p className="rounded border border-stone-200 bg-white px-4 py-6 text-center text-stone-500">
              No new clues yet. Complete dependencies to unlock more.
            </p>
          ) : (
            <div className="space-y-2">
              {availableClues.map((c) => (
                <div
                  key={c.id}
                  className={`cursor-pointer rounded border px-4 py-3 transition ${
                    openClueId === c.id
                      ? "border-amber-500 bg-amber-50"
                      : "border-stone-200 bg-white hover:border-stone-300"
                  }`}
                  onClick={() => setOpenClueId(openClueId === c.id ? null : c.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className="flex gap-1">
                      {c.is_info && (
                        <span className="rounded bg-stone-200 px-2 py-0.5 text-xs">info</span>
                      )}
                      {c.is_room_exit && (
                      <span className="rounded bg-amber-200 px-2 py-0.5 text-xs">
                        Room exit
                      </span>
                      )}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Expanded clue + answer input */}
        {openClue && (
          <div className="fixed inset-0 z-10 flex items-end justify-center bg-black/30 sm:items-center">
            <div
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t border border-stone-300 bg-white shadow-lg sm:rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 border-b border-stone-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{openClue.name}</h3>
                  <button
                    onClick={() => setOpenClueId(null)}
                    className="text-stone-500 hover:text-stone-700"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="space-y-4 p-4">
                {openClue.text && <p className="text-stone-700">{openClue.text}</p>}
                {openClue.image_keys.map((key) => (
                  <img
                    key={key}
                    src={imageUrl(prefix, key)}
                    alt=""
                    className="max-h-64 w-full rounded object-contain"
                  />
                ))}
                {!openClue.is_info && openClue.location_hint && (
                  <details className="rounded border border-stone-200 bg-stone-50">
                    <summary className="cursor-pointer px-3 py-2 text-sm text-stone-600">
                      Location hint (if stuck)
                    </summary>
                    <p className="px-3 pb-2 text-sm text-stone-700">
                      {openClue.location_hint.text}
                    </p>
                  </details>
                )}
                {!openClue.is_info && (
                  <div>
                    <input
                      type="text"
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit(openClue.id)}
                      placeholder="Your answer"
                      className="w-full rounded border border-stone-300 px-3 py-2"
                      autoFocus
                    />
                    {message && (
                      <p
                        className={`mt-2 text-sm ${
                          message.ok ? "text-green-700" : "text-red-600"
                        }`}
                      >
                        {message.text}
                      </p>
                    )}
                    <button
                      onClick={() => handleSubmit(openClue.id)}
                      className="mt-2 w-full rounded bg-stone-800 py-2 text-white hover:bg-stone-900"
                    >
                      Submit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats modal */}
        {showStats && stats && (
          <div
            className="fixed inset-0 z-20 flex items-center justify-center bg-black/30"
            onClick={() => setShowStats(false)}
          >
            <div
              className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded border border-stone-300 bg-white p-6 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="mb-4 text-lg font-semibold">Stats</h2>
              <p className="text-sm text-stone-600">
                Completed: {stats.completed} | Total attempts: {stats.total_attempts}
              </p>
              {stats.clue_times.length > 0 && (
                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-medium">Time per clue</h3>
                  <ul className="space-y-1 text-sm">
                    {stats.clue_times.map((ct) => (
                      <li key={ct.clue_id} className="flex justify-between">
                        <span>{ct.clue_name}</span>
                        <span>
                          {Math.round(ct.seconds)}s ({ct.attempts} attempts)
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={() => setShowStats(false)}
                className="mt-4 w-full rounded border border-stone-300 py-2 hover:bg-stone-50"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
