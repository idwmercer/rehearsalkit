import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  BlackoutsLayout,
  ProductionsLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "idProduction", kind: "text", label: "Show (idProduction)" },
      { key: "DateBlackout", kind: "date", label: "Blackout date" },
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

export const BlackoutsTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Sequential — see ScenesTab for why (single-threaded FM script execution
  // behind the WebViewerAdapter; concurrent fmFetch calls queue and stall).
  const { data, isLoading, isError, error } = useQuery({
    queryFn: async () => {
      const blackouts = await emptyOnNoRecords(() =>
        BlackoutsLayout.list({
          sort: [{ fieldName: "DateBlackout", sortOrder: "ascend" }],
        })
      );
      const productions = await emptyOnNoRecords(() =>
        ProductionsLayout.list()
      );
      return {
        blackouts: blackouts.data,
        productions: productions.data,
      };
    },
    queryKey: ["dev-blackouts-bundle"],
  });

  const blackouts = data?.blackouts ?? [];
  const productionsById = new Map(
    (data?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );

  const q = search.toLowerCase();
  const filtered = blackouts.filter((b) => {
    const show = productionsById.get(b.fieldData.idProduction) ?? "";
    return !q || [show, b.fieldData.Reason].join(" ").toLowerCase().includes(q);
  });

  const selected = blackouts.find((b) => b.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => BlackoutsLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-blackouts-bundle"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => BlackoutsLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-blackouts-bundle"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search blackouts by show or reason…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {blackouts.length} records
        </span>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading blackouts…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load Blackouts:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((b) => {
                const f = b.fieldData;
                return (
                  <tr
                    key={b.recordId}
                    onClick={() => setSelectedRecordId(b.recordId)}
                    className="cursor-pointer border-t border-border hover:bg-gold-100 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {productionsById.get(f.idProduction) || "Unknown show"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtDate(f.DateBlackout)}
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
                    colSpan={4}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No blackouts match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Blackout · Blackouts"
          title={`${
            productionsById.get(selected.fieldData.idProduction) ||
            "Unknown show"
          } — ${fmtDate(selected.fieldData.DateBlackout)}`}
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
