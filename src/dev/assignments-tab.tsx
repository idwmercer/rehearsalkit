import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  CastAssignmentsLayout,
  CastMembersLayout,
  CharactersLayout,
  ProductionsLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const STATUS_OPTIONS = ["Cast", "Understudy", "Swing", "Ensemble", "Released"];

const STATUS_COLORS: Record<string, string> = {
  Cast: "bg-green-200 text-green-800",
  Ensemble: "bg-navy-100 text-navy-600",
  Released: "bg-secondary text-muted-foreground",
  Swing: "bg-gold-200 text-navy-700",
  Understudy: "bg-orange-100 text-orange-700",
};

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      {
        key: "idCastMember",
        kind: "text",
        label: "Cast member (idCastMember)",
      },
      { key: "idProduction", kind: "text", label: "Show (idProduction)" },
      { key: "idCharacter", kind: "text", label: "Character (idCharacter)" },
      {
        key: "Status",
        kind: "select",
        label: "Status",
        options: STATUS_OPTIONS,
      },
      {
        key: "idSourceAuditionEntry",
        kind: "text",
        label: "Source audition entry (idSourceAuditionEntry)",
        span2: true,
      },
    ],
  },
];

export const AssignmentsTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Sequential — see ScenesTab for why (single-threaded FM script execution
  // behind the WebViewerAdapter; concurrent fmFetch calls queue and stall).
  const { data, isLoading, isError, error } = useQuery({
    queryFn: async () => {
      const assignments = await emptyOnNoRecords(() =>
        CastAssignmentsLayout.list()
      );
      const productions = await emptyOnNoRecords(() =>
        ProductionsLayout.list()
      );
      const castMembers = await emptyOnNoRecords(() =>
        CastMembersLayout.list()
      );
      const characters = await emptyOnNoRecords(() => CharactersLayout.list());
      return {
        assignments: assignments.data,
        castMembers: castMembers.data,
        characters: characters.data,
        productions: productions.data,
      };
    },
    queryKey: ["dev-assignments-bundle"],
  });

  const assignments = data?.assignments ?? [];
  const productionsById = new Map(
    (data?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );
  const castMembersById = new Map(
    (data?.castMembers ?? []).map((c) => [
      c.fieldData.id,
      `${c.fieldData.NameFirst} ${c.fieldData.NameLast}`.trim(),
    ])
  );
  const charactersById = new Map(
    (data?.characters ?? []).map((c) => [
      c.fieldData.id,
      c.fieldData.CharacterName,
    ])
  );

  const q = search.toLowerCase();
  const filtered = assignments.filter((a) => {
    const member = castMembersById.get(a.fieldData.idCastMember) ?? "";
    const show = productionsById.get(a.fieldData.idProduction) ?? "";
    const character = charactersById.get(a.fieldData.idCharacter) ?? "";
    return !q || [member, show, character].join(" ").toLowerCase().includes(q);
  });

  const selected = assignments.find((a) => a.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => CastAssignmentsLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-assignments-bundle"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) =>
      CastAssignmentsLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-assignments-bundle"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by cast member, show, or character…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {assignments.length} records
        </span>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading assignments…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load CastAssignments:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Cast member</th>
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Character</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const f = a.fieldData;
                const statusClass =
                  STATUS_COLORS[f.Status] ??
                  "bg-secondary text-muted-foreground";
                return (
                  <tr
                    key={a.recordId}
                    onClick={() => setSelectedRecordId(a.recordId)}
                    className="cursor-pointer border-t border-border hover:bg-gold-100 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {castMembersById.get(f.idCastMember) ||
                        "Unknown cast member"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {productionsById.get(f.idProduction) || "Unknown show"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {charactersById.get(f.idCharacter) || "Unassigned"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                      >
                        {f.Status || "—"}
                      </span>
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
                    No assignments match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Assignment · CastAssignments"
          title={`${
            castMembersById.get(selected.fieldData.idCastMember) ||
            "Unknown cast member"
          } — ${
            charactersById.get(selected.fieldData.idCharacter) || "Unassigned"
          }`}
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
