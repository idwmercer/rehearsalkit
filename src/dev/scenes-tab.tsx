import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  ProductionsLayout,
  SceneCharactersLayout,
  ScenesLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "Title", kind: "text", label: "Title" },
      { key: "idProduction", kind: "text", label: "Show (idProduction)" },
    ],
  },
  {
    fields: [
      {
        key: "Description",
        kind: "textarea",
        label: "Description / page range",
        span2: true,
      },
    ],
  },
];

export const ScenesTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Sequential — WebViewerAdapter scripts execute single-threaded in
  // FileMaker, so this avoids racing concurrent fmFetch calls.
  const { data, isLoading, isError, error } = useQuery({
    queryFn: async () => {
      const scenes = await emptyOnNoRecords(() =>
        ScenesLayout.list({
          sort: [{ fieldName: "Title", sortOrder: "ascend" }],
        })
      );
      const productions = await emptyOnNoRecords(() =>
        ProductionsLayout.list()
      );
      const sceneCharacters = await emptyOnNoRecords(() =>
        SceneCharactersLayout.list()
      );
      return {
        productions: productions.data,
        sceneCharacters: sceneCharacters.data,
        scenes: scenes.data,
      };
    },
    queryKey: ["dev-scenes-bundle"],
  });

  const scenes = data?.scenes ?? [];
  const productionsById = new Map(
    (data?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );

  const charCountByScene = new Map<string, number>();
  for (const sc of data?.sceneCharacters ?? []) {
    const key = sc.fieldData.idScene;
    charCountByScene.set(key, (charCountByScene.get(key) ?? 0) + 1);
  }

  const q = search.toLowerCase();
  const filtered = scenes.filter((s) => {
    const show = productionsById.get(s.fieldData.idProduction) ?? "";
    return (
      !q ||
      [s.fieldData.Title, show, s.fieldData.Description]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  });

  const selected = scenes.find((s) => s.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => ScenesLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-scenes-bundle"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => ScenesLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-scenes-bundle"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scenes by title, show, or description…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {scenes.length} records
        </span>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading scenes…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load Scenes:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Characters</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const f = s.fieldData;
                return (
                  <tr
                    key={s.recordId}
                    onClick={() => setSelectedRecordId(s.recordId)}
                    className="cursor-pointer border-t border-border hover:bg-gold-100 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {f.Title || "Untitled"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {productionsById.get(f.idProduction) || "Unknown show"}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                      {f.Description || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {charCountByScene.get(f.id) ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
                        {f.id}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No scenes match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Scene · Scenes"
          title={selected.fieldData.Title || "Untitled scene"}
          recordId={selected.recordId}
          fieldData={selected.fieldData}
          groups={FIELD_GROUPS}
          onClose={() => setSelectedRecordId(null)}
          onSave={(fieldData) =>
            updateMutation.mutateAsync({
              fieldData,
              recordId: selected.recordId,
            })
          }
          onDelete={() => deleteMutation.mutateAsync(selected.recordId)}
        />
      )}
    </section>
  );
};
