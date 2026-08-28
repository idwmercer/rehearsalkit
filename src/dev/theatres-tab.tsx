import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { TheatresLayout } from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "TheatreName", kind: "text", label: "Theatre name", span2: true },
      {
        key: "idAdminAccount",
        kind: "text",
        label: "Admin account (idAdminAccount)",
        span2: true,
      },
    ],
  },
];

export const TheatresTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryFn: () =>
      emptyOnNoRecords(() =>
        TheatresLayout.list({
          sort: [{ fieldName: "TheatreName", sortOrder: "ascend" }],
        })
      ),
    queryKey: ["dev-theatres"],
  });

  const theatres = data?.data ?? [];
  const q = search.toLowerCase();
  const filtered = theatres.filter(
    (t) =>
      !q ||
      [t.fieldData.TheatreName, t.fieldData.idAdminAccount]
        .join(" ")
        .toLowerCase()
        .includes(q)
  );

  const selected = theatres.find((t) => t.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => TheatresLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-theatres"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => TheatresLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-theatres"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search theatres by name or admin account…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {theatres.length} records
        </span>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading theatres…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load Theatres:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Theatre name</th>
                <th className="px-4 py-3">Admin account</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const f = t.fieldData;
                return (
                  <tr
                    key={t.recordId}
                    onClick={() => setSelectedRecordId(t.recordId)}
                    className="cursor-pointer border-t border-border hover:bg-gold-100 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {f.TheatreName || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.idAdminAccount || "—"}
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
                    colSpan={3}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No theatres match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Theatre · Theatres"
          title={selected.fieldData.TheatreName || "Unnamed theatre"}
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
