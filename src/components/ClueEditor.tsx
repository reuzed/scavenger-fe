import { useState, useCallback, useEffect } from "react";
import type { Clue, AnswerValidationConfig, Room } from "../types";

interface ClueEditorProps {
  clue: Clue;
  rooms: Room[];
  onChange: (clue: Clue) => void;
  onClose: () => void;
  imageUrl: (key: string) => string;
  onUploadImage?: (file: File) => Promise<{ key: string; url: string }>;
  onRoomExitChange?: (clueId: string, roomId: string, isExit: boolean) => void;
}

const MATCH_TYPES = [
  { value: "exact", label: "Exact" },
  { value: "case_insensitive", label: "Case insensitive" },
  { value: "fuzzy", label: "Fuzzy (typos)" },
  { value: "contains", label: "Contains" },
] as const;

export default function ClueEditor({ clue, rooms, onChange, onClose, imageUrl, onUploadImage, onRoomExitChange }: ClueEditorProps) {
  const [answersText, setAnswersText] = useState(clue.answer_config.allowed_answers.join("\n"));
  const [wrongMessagesText, setWrongMessagesText] = useState(
    () => Object.entries(clue.answer_config.wrong_answer_messages).map(([k, v]) => `${k}: ${v}`).join("\n")
  );
  const [dragOver, setDragOver] = useState(false);

  // Sync local state when clue changes (e.g. switching to another clue)
  useEffect(() => {
    setAnswersText(clue.answer_config.allowed_answers.join("\n"));
    setWrongMessagesText(
      Object.entries(clue.answer_config.wrong_answer_messages).map(([k, v]) => `${k}: ${v}`).join("\n")
    );
  }, [clue.id, clue.answer_config.allowed_answers, clue.answer_config.wrong_answer_messages]);

  const update = (patch: Partial<Clue>) => {
    onChange({ ...clue, ...patch });
  };

  const updateAnswerConfig = (patch: Partial<AnswerValidationConfig>) => {
    onChange({
      ...clue,
      answer_config: { ...clue.answer_config, ...patch },
    });
  };

  const saveAnswers = () => {
    const list = answersText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    updateAnswerConfig({ allowed_answers: list });
  };

  const addImage = useCallback(
    async (file: File) => {
      if (!onUploadImage) return;
      const { key } = await onUploadImage(file);
      update({ image_keys: [...clue.image_keys, key] });
    },
    [clue.image_keys, onUploadImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
      files.forEach((f) => addImage(f));
    },
    [addImage]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file" && item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) addImage(file);
        }
      }
    },
    [addImage]
  );

  const removeImage = (idx: number) => {
    update({ image_keys: clue.image_keys.filter((_, i) => i !== idx) });
  };

  const isInfo = clue.is_info ?? false;

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold">{isInfo ? "Edit Information" : "Edit Clue"}</h2>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-700">
          ✕
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-600">Name</label>
          <input
            type="text"
            value={clue.name}
            onChange={(e) => update({ name: e.target.value })}
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>

        {!isInfo && (
          <>
            <div>
              <label className="block text-sm font-medium text-stone-600">Room</label>
              <select
                value={clue.room_id}
                onChange={(e) => update({ room_id: e.target.value })}
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={clue.is_room_exit}
                  onChange={(e) => {
                    const isExit = e.target.checked;
                    update({ is_room_exit: isExit });
                    onRoomExitChange?.(clue.id, clue.room_id, isExit);
                  }}
                />
                <span className="text-sm font-medium text-stone-600">Room exit (unlocks next room)</span>
              </label>
            </div>
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-stone-600">Text</label>
          <textarea
            value={clue.text}
            onChange={(e) => update({ text: e.target.value })}
            placeholder="Clue text"
            className="mt-1 w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
            rows={4}
          />
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-stone-600">Images</h3>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onPaste={handlePaste}
            className={`min-h-24 rounded border-2 border-dashed p-3 ${
              dragOver ? "border-amber-500 bg-amber-50" : "border-stone-300"
            }`}
          >
            <div className="flex flex-wrap gap-2">
              {clue.image_keys.map((key, i) => (
                <div key={key} className="relative">
                  <img
                    src={imageUrl(key)}
                    alt=""
                    className="max-h-24 rounded border object-contain"
                  />
                  <button
                    onClick={() => removeImage(i)}
                    className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 py-0.5 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
              {onUploadImage && (
                <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded border border-dashed border-stone-400 text-2xl text-stone-400 hover:bg-stone-100">
                  +
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        Array.from(files).forEach((f) => addImage(f));
                        e.target.value = "";
                      }
                    }}
                  />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Drop images here, paste, or click + to add
            </p>
          </div>
        </div>

        {!isInfo && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-stone-600">Location hint (optional)</h3>
          <input
            type="text"
            value={clue.location_hint?.text ?? ""}
            onChange={(e) =>
              update({
                location_hint: e.target.value ? { text: e.target.value } : undefined,
              })
            }
            placeholder="e.g. Near the fountain"
            className="w-full rounded border border-stone-300 px-2 py-1.5 text-sm"
          />
        </div>
        )}

        {!isInfo && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-stone-600">Answer config</h3>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-stone-500">Match type</label>
              <select
                value={clue.answer_config.match_type}
                onChange={(e) =>
                  updateAnswerConfig({
                    match_type: e.target.value as AnswerValidationConfig["match_type"],
                  })
                }
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              >
                {MATCH_TYPES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            {clue.answer_config.match_type === "fuzzy" && (
              <div>
                <label className="block text-xs text-stone-500">Max edit distance</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={clue.answer_config.max_edit_distance}
                  onChange={(e) =>
                    updateAnswerConfig({
                      max_edit_distance: parseInt(e.target.value) || 1,
                    })
                  }
                  className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
                />
              </div>
            )}
            <div>
              <label className="block text-xs text-stone-500">Allowed answers (one per line)</label>
              <textarea
                value={answersText}
                onChange={(e) => setAnswersText(e.target.value)}
                onBlur={saveAnswers}
                placeholder="answer1&#10;answer2"
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500">Default wrong message</label>
              <input
                type="text"
                value={clue.answer_config.default_wrong_message}
                onChange={(e) =>
                  updateAnswerConfig({ default_wrong_message: e.target.value })
                }
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-stone-500">Custom messages (key: message)</label>
              <p className="text-xs text-stone-400">Keys: typo, too_short, empty, wrong</p>
              <textarea
                value={wrongMessagesText}
                onChange={(e) => setWrongMessagesText(e.target.value)}
                onBlur={() => {
                  const obj: Record<string, string> = {};
                  wrongMessagesText.split("\n").forEach((line) => {
                    const i = line.indexOf(":");
                    if (i > 0) {
                      obj[line.slice(0, i).trim()] = line.slice(i + 1).trim();
                    }
                  });
                  updateAnswerConfig({ wrong_answer_messages: obj });
                }}
                placeholder="typo: Close! Check your spelling"
                className="mt-1 w-full rounded border border-stone-300 px-2 py-1 text-sm"
                rows={2}
              />
            </div>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
