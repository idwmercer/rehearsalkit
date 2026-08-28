import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  CastConflictsLayout,
  CastMembersLayout,
  ProductionsLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const TIME_BLOCK_OPTIONS = ["All Day", "Morning", "Afternoon", "Evening"];

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      {
        key: "idCastMember",
        kind: "text",
        label: "Cast member (idCastMember)",
      },
      { key: "idProduction", kind: "text", label: "Show (idProduction)" },
      { key: "DateConflict", kind: "date", label: "Conflict date" },
      {
        key: "TimeBlock",
        kind: "select",
        label: "Time block",
        options: TIME_BLOCK_OPTIONS,
      },
      { key: "SubmittedDate", kind: "date", label: "Submitted date" },
    ],
  },
  {
    fields: [{ key: "Reason", kind: "textarea", label: "Reason", span2: true }],
  },
];

const fmtDate = (d: string) => {
  if (!d) {
    return "—";
  }
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) {
    return d;
  }
  return dt.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const ConflictsTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Sequential — see ScenesTab for why (single-threaded FM script execution
  // behind the WebViewerAdapter; concurrent fmFetch calls queue and stall).
  const { data, isLoading, isError, error } = useQuery({
    queryFn: async () => {
      const conflicts = await emptyOnNoRecords(() =>
        CastConflictsLayout.list({
          sort: [{ fieldName: "DateConflict", sortOrder: "ascend" }],
        })
      );
      const castMembers = await emptyOnNoRecords(() =>
        CastMembersLayout.list()
      );
      const productions = await emptyOnNoRecords(() =>
        ProductionsLayout.list()
      );
      return {
        castMembers: castMembers.data,
        conflicts: conflicts.data,
        productions: productions.data,
      };
    },
    queryKey: ["dev-conflicts-bundle"],
  });

  const conflicts = data?.conflicts ?? [];
  const productionsById = new Map(
    (data?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );
  const castMembersById = new Map(
    (data?.castMembers ?? []).map((c) => [
      c.fieldData.id,
      `${c.fieldData.NameFirst} ${c.fieldData.NameLast}`.trim(),
    ])
  );

  const q = search.toLowerCase();
  const filtered = conflicts.filter((c) => {
    const member = castMembersById.get(c.fieldData.idCastMember) ?? "";
    const show = productionsById.get(c.fieldData.idProduction) ?? "";
    return (
      !q ||
      [member, show, c.fieldData.Reason, c.fieldData.TimeBlock]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  });

  const selected = conflicts.find((c) => c.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => CastConflictsLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-conflicts-bundle"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => CastConflictsLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-conflicts-bundle"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search conflicts by cast member, show, or reason…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {conflicts.length} records
        </span>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading conflicts…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load CastConflicts:{" "}
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
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time block</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const f = c.fieldData;
                return (
                  <tr
                    key={c.recordId}
                    onClick={() => setSelectedRecordId(c.recordId)}
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
                      {fmtDate(f.DateConflict)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.TimeBlock || "All Day"}
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                      {f.Reason || "—"}
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
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No conflicts match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Conflict · CastConflicts"
          title={`${
            castMembersById.get(selected.fieldData.idCastMember) ||
            "Unknown cast member"
          } — ${fmtDate(selected.fieldData.DateConflict)}`}
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
