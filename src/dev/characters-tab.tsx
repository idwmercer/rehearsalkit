import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  CastAssignmentsLayout,
  CastMembersLayout,
  CharactersLayout,
  ProductionsLayout,
  SceneCharactersLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { buildLookups } from "./lookups";
import { NewRecordButton, RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const QUERY_KEY = ["dev-characters-bundle"];

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "CharacterName", kind: "text", label: "Character name" },
      {
        key: "idProduction",
        kind: "relation",
        label: "Show",
        lookup: "productions",
      },
      { key: "SortOrder", kind: "text", label: "Sort order" },
      { key: "AgeRange", kind: "text", label: "Age range" },
      { key: "VocalRange", kind: "text", label: "Vocal range" },
    ],
  },
  {
    fields: [
      {
        key: "Description",
        kind: "textarea",
        label: "Description",
        span2: true,
      },
      { key: "Notes", kind: "textarea", label: "Notes", span2: true },
    ],
  },
];

const countScenesByCharacter = (
  sceneCharacters: { fieldData: { idCharacter: string } }[]
): Map<string, number> => {
  const counts = new Map<string, number>();
  for (const sc of sceneCharacters) {
    const key = sc.fieldData.idCharacter;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

// Released assignments are not shown as the character's cast, matching how
// Confirm/Place Session decides who is called.
const groupCastByCharacter = (
  assignments: {
    fieldData: { idCastMember: string; idCharacter: string; Status: string };
  }[],
  castMembers: {
    fieldData: { id: string; NameFirst: string; NameLast: string };
  }[]
): Map<string, string[]> => {
  const nameById = new Map(
    castMembers.map((m) => [
      m.fieldData.id,
      `${m.fieldData.NameFirst} ${m.fieldData.NameLast}`.trim(),
    ])
  );
  const byCharacter = new Map<string, string[]>();
  for (const a of assignments) {
    const name = nameById.get(a.fieldData.idCastMember);
    if (a.fieldData.Status === "Released" || !name) {
      continue;
    }
    const key = a.fieldData.idCharacter;
    byCharacter.set(key, [...(byCharacter.get(key) ?? []), name]);
  }
  return byCharacter;
};

export const CharactersTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Sequential — WebViewerAdapter scripts execute single-threaded in
  // FileMaker, so this avoids racing concurrent fmFetch calls.
  const { data, isLoading, isError, error } = useQuery({
    queryFn: async () => {
      const characters = await emptyOnNoRecords(() =>
        CharactersLayout.list({
          sort: [{ fieldName: "SortOrder", sortOrder: "ascend" }],
        })
      );
      const productions = await emptyOnNoRecords(() =>
        ProductionsLayout.list()
      );
      const sceneCharacters = await emptyOnNoRecords(() =>
        SceneCharactersLayout.list()
      );
      const assignments = await emptyOnNoRecords(() =>
        CastAssignmentsLayout.list()
      );
      const castMembers = await emptyOnNoRecords(() =>
        CastMembersLayout.list()
      );
      return {
        assignments: assignments.data,
        castMembers: castMembers.data,
        characters: characters.data,
        productions: productions.data,
        sceneCharacters: sceneCharacters.data,
      };
    },
    queryKey: QUERY_KEY,
  });

  const characters = data?.characters ?? [];
  const productionsById = new Map(
    (data?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );
  const sceneCountByCharacter = countScenesByCharacter(
    data?.sceneCharacters ?? []
  );
  const castByCharacter = groupCastByCharacter(
    data?.assignments ?? [],
    data?.castMembers ?? []
  );

  const q = search.toLowerCase();
  const filtered = characters.filter((c) => {
    const show = productionsById.get(c.fieldData.idProduction) ?? "";
    return (
      !q ||
      [
        c.fieldData.CharacterName,
        show,
        c.fieldData.Description,
        (castByCharacter.get(c.fieldData.id) ?? []).join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  });

  const selected = characters.find((c) => c.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => CharactersLayout.update({ fieldData, recordId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => CharactersLayout.delete({ recordId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const createMutation = useMutation({
    mutationFn: (fieldData: Record<string, string>) =>
      CharactersLayout.create({ fieldData }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  const lookups = buildLookups(data);

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search characters by name, show, description, or cast…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:border-navy-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-orange-500/30"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {characters.length} records
          </span>
          <NewRecordButton
            label="New character"
            onClick={() => setCreating(true)}
          />
        </div>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading characters…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load Characters:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Cast</th>
                <th className="px-4 py-3">Scenes</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const f = c.fieldData;
                const cast = castByCharacter.get(f.id) ?? [];
                return (
                  <tr
                    key={c.recordId}
                    onClick={() => setSelectedRecordId(c.recordId)}
                    className="cursor-pointer border-t border-border hover:bg-gold-100 transition-colors"
                  >
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.SortOrder || "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {f.CharacterName || "Unnamed character"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {productionsById.get(f.idProduction) || "Unknown show"}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                      {f.Description || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {cast.length > 0 ? cast.join(", ") : "Uncast"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {sceneCountByCharacter.get(f.id) ?? 0}
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
                    colSpan={7}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No characters match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Character · Characters"
          title={selected.fieldData.CharacterName || "Unnamed character"}
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
        />
      )}

      {creating && (
        <RecordEditModal
          eyebrow="Character · Characters"
          title="New character"
          groups={FIELD_GROUPS}
          lookups={lookups}
          onClose={() => setCreating(false)}
          onSave={(fieldData) => createMutation.mutateAsync(fieldData)}
        />
      )}
    </section>
  );
};
