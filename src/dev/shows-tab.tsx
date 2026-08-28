import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ProductionsLayout } from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const STATUS_OPTIONS = [
  "Planning",
  "Casting",
  "Pre-Production",
  "In Rehearsal",
  "Tech",
  "Running",
  "Closed",
];
const PRODUCTION_TYPE_OPTIONS = ["Play", "Musical"];

const STATUS_COLORS: Record<string, string> = {
  Casting: "bg-orange-100 text-orange-700",
  Closed: "bg-secondary text-muted-foreground",
  "In Rehearsal": "bg-green-200 text-green-800",
  Planning: "bg-navy-100 text-navy-600",
  "Pre-Production": "bg-navy-100 text-navy-600",
  Running: "bg-green-100 text-green-700",
  Tech: "bg-gold-200 text-navy-700",
};

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "Title", kind: "text", label: "Title", span2: true },
      {
        key: "Status",
        kind: "select",
        label: "Status",
        options: STATUS_OPTIONS,
      },
      {
        key: "ProductionType",
        kind: "select",
        label: "Production type",
        options: PRODUCTION_TYPE_OPTIONS,
      },
      { key: "Season", kind: "text", label: "Season" },
      { key: "DateRehearsalStart", kind: "date", label: "Rehearsals start" },
      { key: "DateOpening", kind: "date", label: "Opening" },
      { key: "DateClosing", kind: "date", label: "Closing" },
      { key: "idOwner", kind: "text", label: "Owner (idOwner)" },
      { key: "idTheatre", kind: "text", label: "Theatre (idTheatre)" },
      {
        key: "isActorPortalEnabled",
        kind: "select",
        label: "Actor portal enabled (0/1)",
        options: ["0", "1"],
      },
      {
        key: "ActorPortalLink",
        kind: "text",
        label: "Actor portal link",
        span2: true,
      },
      {
        key: "idSuiteProduction",
        kind: "text",
        label: "Suite production (idSuiteProduction)",
        span2: true,
      },
    ],
  },
  {
    fields: [
      { key: "Synopsis", kind: "textarea", label: "Synopsis", span2: true },
    ],
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

export const ShowsTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryFn: () =>
      emptyOnNoRecords(() =>
        ProductionsLayout.list({
          sort: [
            { fieldName: "Season", sortOrder: "descend" },
            { fieldName: "Title", sortOrder: "ascend" },
          ],
        })
      ),
    queryKey: ["dev-productions"],
  });

  const shows = data?.data ?? [];
  const q = search.toLowerCase();
  const filtered = shows.filter(
    (s) =>
      !q ||
      [s.fieldData.Title, s.fieldData.Season, s.fieldData.idOwner]
        .join(" ")
        .toLowerCase()
        .includes(q)
  );

  const selected = shows.find((s) => s.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => ProductionsLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-productions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => ProductionsLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-productions"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search shows by title, season, or owner…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {shows.length} records
        </span>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading shows…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load Productions:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Season</th>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Opens</th>
                <th className="px-4 py-3">Actor portal</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const f = s.fieldData;
                const statusClass =
                  STATUS_COLORS[f.Status] ??
                  "bg-secondary text-muted-foreground";
                return (
                  <tr
                    key={s.recordId}
                    onClick={() => setSelectedRecordId(s.recordId)}
                    className="cursor-pointer border-t border-border hover:bg-gold-100 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">{f.Title}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                      >
                        {f.Status || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.Season || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.idOwner || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmtDate(f.DateOpening)}
                    </td>
                    <td className="px-4 py-3">
                      {Number(f.isActorPortalEnabled) ? (
                        <span className="text-xs font-semibold text-green-700">
                          Enabled
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Off
                        </span>
                      )}
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
                    No shows match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Show · Productions"
          title={selected.fieldData.Title || "Untitled production"}
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
