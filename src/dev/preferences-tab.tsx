import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  DayTimePreferencesLayout,
  ProductionsLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const DAY_OPTIONS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const TIME_BLOCK_OPTIONS = ["All Day", "Morning", "Afternoon", "Evening"];
const PREFERENCE_TYPE_OPTIONS = ["Target", "Avoid"];

const PREFERENCE_TYPE_COLORS: Record<string, string> = {
  Avoid: "bg-rust-100 text-rust-700",
  Target: "bg-green-200 text-green-800",
};

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "idProduction", kind: "text", label: "Show (idProduction)" },
      {
        key: "DayOfWeek",
        kind: "select",
        label: "Day of week",
        options: DAY_OPTIONS,
      },
      {
        key: "TimeBlock",
        kind: "select",
        label: "Time block",
        options: TIME_BLOCK_OPTIONS,
      },
      {
        key: "PreferenceType",
        kind: "select",
        label: "Preference type",
        options: PREFERENCE_TYPE_OPTIONS,
      },
    ],
  },
];

export const PreferencesTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Sequential — see ScenesTab for why (single-threaded FM script execution
  // behind the WebViewerAdapter; concurrent fmFetch calls queue and stall).
  const { data, isLoading, isError, error } = useQuery({
    queryFn: async () => {
      const preferences = await emptyOnNoRecords(() =>
        DayTimePreferencesLayout.list()
      );
      const productions = await emptyOnNoRecords(() =>
        ProductionsLayout.list()
      );
      return {
        preferences: preferences.data,
        productions: productions.data,
      };
    },
    queryKey: ["dev-preferences-bundle"],
  });

  const preferences = data?.preferences ?? [];
  const productionsById = new Map(
    (data?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );

  const q = search.toLowerCase();
  const filtered = preferences.filter((p) => {
    const show = productionsById.get(p.fieldData.idProduction) ?? "";
    return (
      !q ||
      [
        show,
        p.fieldData.DayOfWeek,
        p.fieldData.TimeBlock,
        p.fieldData.PreferenceType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  });

  const selected = preferences.find((p) => p.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => DayTimePreferencesLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-preferences-bundle"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) =>
      DayTimePreferencesLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-preferences-bundle"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search preferences by show, day, or type…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <span className="text-sm text-muted-foreground">
          {filtered.length} of {preferences.length} records
        </span>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading preferences…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load DayTimePreferences:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Show</th>
                <th className="px-4 py-3">Day</th>
                <th className="px-4 py-3">Time block</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">id</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const f = p.fieldData;
                const typeClass =
                  PREFERENCE_TYPE_COLORS[f.PreferenceType] ??
                  "bg-secondary text-muted-foreground";
                return (
                  <tr
                    key={p.recordId}
                    onClick={() => setSelectedRecordId(p.recordId)}
                    className="cursor-pointer border-t border-border hover:bg-gold-100 transition-colors"
                  >
                    <td className="px-4 py-3 font-semibold">
                      {productionsById.get(f.idProduction) || "Unknown show"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.DayOfWeek || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.TimeBlock || "All Day"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${typeClass}`}
                      >
                        {f.PreferenceType || "—"}
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
                    No preferences match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Preference · DayTimePreferences"
          title={`${selected.fieldData.PreferenceType || "Preference"} — ${
            selected.fieldData.DayOfWeek || "?"
          } ${selected.fieldData.TimeBlock || ""}`.trim()}
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
