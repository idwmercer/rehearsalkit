import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  CharactersLayout,
  ProductionsLayout,
  SceneCharactersLayout,
  ScenesLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { LinkedRecordsPanel } from "./linked-records-panel";
import { buildLookups } from "./lookups";
import { NewRecordButton, RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "Title", kind: "text", label: "Title" },
      {
        key: "idProduction",
        kind: "relation",
        label: "Show",
        lookup: "productions",
      },
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

const SCENES_QUERY_KEY = ["dev-scenes-bundle"];

interface SceneCharactersData {
  characters: {
    fieldData: { CharacterName: string; id: string; idProduction: string };
  }[];
  sceneCharacters: {
    fieldData: { idCharacter: string; idScene: string };
    recordId: string;
  }[];
}

interface SceneCharactersSectionProps {
  data: SceneCharactersData | undefined;
  productionId: string;
  sceneId: string;
}

// Which characters are in a scene. Each add / remove is its own SceneCharacters
// record, saved straight away (not with the form's Save button). Only
// characters from the scene's own show can be added.
const SceneCharactersSection = ({
  data,
  productionId,
  sceneId,
}: SceneCharactersSectionProps) => {
  const characters = data?.characters ?? [];
  const sceneCharacters = data?.sceneCharacters ?? [];
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: SCENES_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (idCharacter: string) =>
      SceneCharactersLayout.create({
        fieldData: { idCharacter, idScene: sceneId },
      }),
    onSuccess: refresh,
  });
  const removeMutation = useMutation({
    mutationFn: (recordId: string) =>
      SceneCharactersLayout.delete({ recordId }),
    onSuccess: refresh,
  });

  const nameById = new Map(
    characters.map((c) => [c.fieldData.id, c.fieldData.CharacterName])
  );
  const links = sceneCharacters.filter((l) => l.fieldData.idScene === sceneId);
  const linkedIds = new Set(links.map((l) => l.fieldData.idCharacter));

  return (
    <LinkedRecordsPanel
      addPlaceholder="Add a character…"
      emptyText="No characters linked to this scene yet."
      heading="Characters in this scene"
      items={links.map((l) => ({
        label: nameById.get(l.fieldData.idCharacter) ?? "Unknown character",
        recordId: l.recordId,
      }))}
      onAdd={(idCharacter) => addMutation.mutateAsync(idCharacter)}
      onRemove={(recordId) => removeMutation.mutateAsync(recordId)}
      options={characters
        .filter(
          (c) =>
            c.fieldData.idProduction === productionId &&
            !linkedIds.has(c.fieldData.id)
        )
        .map((c) => ({
          label: c.fieldData.CharacterName,
          value: c.fieldData.id,
        }))}
    />
  );
};

export const ScenesTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

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
      const characters = await emptyOnNoRecords(() => CharactersLayout.list());
      return {
        characters: characters.data,
        productions: productions.data,
        sceneCharacters: sceneCharacters.data,
        scenes: scenes.data,
      };
    },
    queryKey: SCENES_QUERY_KEY,
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

  const createMutation = useMutation({
    mutationFn: (fieldData: Record<string, string>) =>
      ScenesLayout.create({ fieldData }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-scenes-bundle"] }),
  });

  const lookups = buildLookups(data);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search scenes by title, show, or description…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:border-navy-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-orange-500/30"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {scenes.length} records
          </span>
          <NewRecordButton
            label="New scene"
            onClick={() => setCreating(true)}
          />
        </div>
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
          lookups={lookups}
          onClose={() => setSelectedRecordId(null)}
          onSave={(fieldData) =>
            updateMutation.mutateAsync({
              fieldData,
              recordId: selected.recordId,
            })
          }
          onDelete={() => deleteMutation.mutateAsync(selected.recordId)}
        >
          <SceneCharactersSection
            data={data}
            productionId={selected.fieldData.idProduction}
            sceneId={selected.fieldData.id}
          />
        </RecordEditModal>
      )}

      {creating && (
        <RecordEditModal
          eyebrow="Scene · Scenes"
          title="New scene"
          groups={FIELD_GROUPS}
          lookups={lookups}
          onClose={() => setCreating(false)}
          onSave={(fieldData) => createMutation.mutateAsync(fieldData)}
        />
      )}
    </section>
  );
};
