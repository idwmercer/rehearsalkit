import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { KitVersionLayout } from "../config/schemas/filemaker/client";
import type { TKitVersion } from "../config/schemas/filemaker/generated/KitVersion";
import { emptyOnNoRecords } from "../lib/data";

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/40";
const numberInputClass = `${inputClass} w-20 text-center`;
const labelClass =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

interface VersionFormValues {
  AppliedDate: string;
  idProductRelease: string;
  Notes: string;
  ReleaseDate: string;
  ReleaseNotes: string;
  VersionMajor: string;
  VersionMinor: string;
  VersionPatch: string;
}

const toFormValues = (record: TKitVersion): VersionFormValues => ({
  AppliedDate: record.AppliedDate,
  Notes: record.Notes,
  ReleaseDate: record.ReleaseDate,
  ReleaseNotes: record.ReleaseNotes,
  VersionMajor: String(record.VersionMajor),
  VersionMinor: String(record.VersionMinor),
  VersionPatch: String(record.VersionPatch),
  idProductRelease: record.idProductRelease,
});

const VersionForm = ({
  fieldData,
  recordId,
}: {
  fieldData: TKitVersion;
  recordId: string;
}) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VersionFormValues>(() =>
    toFormValues(fieldData)
  );
  const [justSaved, setJustSaved] = useState(false);

  const setField = (key: keyof VersionFormValues, value: string) => {
    setJustSaved(false);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: (values: VersionFormValues) =>
      KitVersionLayout.update({ fieldData: values, recordId }),
    onSuccess: async () => {
      setJustSaved(true);
      await queryClient.invalidateQueries({ queryKey: ["dev-kit-version"] });
    },
  });

  const previewVersion = `${form.VersionMajor || "0"}.${form.VersionMinor || "0"}.${form.VersionPatch || "0"}`;

  return (
    <section className="max-w-2xl space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <p className={labelClass}>This file&rsquo;s installed version</p>
        <p className="mt-1.5 text-3xl font-semibold tracking-tight">
          {fieldData.VersionLabel || previewVersion}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Read by the RehearsalKit CWP version badge from{" "}
          <code className="rounded bg-secondary px-1 py-0.5">
            KitVersion_api
          </code>
          . Not synced from AreWeAllMet — update it here whenever this file
          actually gets updated to a new release.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className={`${labelClass} mb-3`}>Version number</p>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="v-major">
              Major
            </label>
            <input
              className={numberInputClass}
              id="v-major"
              min={0}
              onChange={(e) => setField("VersionMajor", e.target.value)}
              type="number"
              value={form.VersionMajor}
            />
          </div>
          <span className="pb-2.5 text-lg text-muted-foreground">.</span>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="v-minor">
              Minor
            </label>
            <input
              className={numberInputClass}
              id="v-minor"
              min={0}
              onChange={(e) => setField("VersionMinor", e.target.value)}
              type="number"
              value={form.VersionMinor}
            />
          </div>
          <span className="pb-2.5 text-lg text-muted-foreground">.</span>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="v-patch">
              Patch
            </label>
            <input
              className={numberInputClass}
              id="v-patch"
              min={0}
              onChange={(e) => setField("VersionPatch", e.target.value)}
              type="number"
              value={form.VersionPatch}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3.5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="v-release-date">
              Release date
            </label>
            <input
              className={inputClass}
              id="v-release-date"
              inputMode="numeric"
              onChange={(e) => setField("ReleaseDate", e.target.value)}
              placeholder="MM/DD/YYYY"
              type="text"
              value={form.ReleaseDate}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="v-applied-date">
              Applied date
            </label>
            <input
              className={inputClass}
              id="v-applied-date"
              inputMode="numeric"
              onChange={(e) => setField("AppliedDate", e.target.value)}
              placeholder="MM/DD/YYYY"
              type="text"
              value={form.AppliedDate}
            />
            <span className="text-xs text-muted-foreground">
              When this file was actually updated — may lag release date.
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className={`${labelClass} mb-3`}>Hub correlation</p>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass} htmlFor="v-id-release">
            AreWeAllMet ProductReleases id
          </label>
          <input
            className={`${inputClass} font-mono`}
            id="v-id-release"
            onChange={(e) => setField("idProductRelease", e.target.value)}
            placeholder="Paste the id from the Releases tab in AreWeAllMet"
            type="text"
            value={form.idProductRelease}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <p className={`${labelClass} mb-3`}>Notes</p>
        <div className="space-y-3.5">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="v-release-notes">
              Release notes (what&rsquo;s new)
            </label>
            <textarea
              className={`${inputClass} min-h-20 resize-y`}
              id="v-release-notes"
              onChange={(e) => setField("ReleaseNotes", e.target.value)}
              value={form.ReleaseNotes}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass} htmlFor="v-notes">
              Internal notes
            </label>
            <textarea
              className={`${inputClass} min-h-16 resize-y`}
              id="v-notes"
              onChange={(e) => setField("Notes", e.target.value)}
              value={form.Notes}
            />
          </div>
        </div>
      </div>

      {saveMutation.isError && (
        <p className="text-sm text-destructive">
          {saveMutation.error instanceof Error
            ? saveMutation.error.message
            : "Failed to save version."}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate(form)}
          type="button"
        >
          {saveMutation.isPending ? "Saving…" : "Save version"}
        </button>
        {justSaved && !saveMutation.isPending && (
          <span className="text-sm text-muted-foreground">Saved.</span>
        )}
      </div>
    </section>
  );
};

export const VersionTab = () => {
  const { data, isLoading, isError, error } = useQuery({
    queryFn: () => emptyOnNoRecords(() => KitVersionLayout.list({ limit: 1 })),
    queryKey: ["dev-kit-version"],
  });

  const record = data?.data[0];

  if (isLoading) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading version…
      </p>
    );
  }
  if (isError || !record) {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        Failed to load KitVersion:{" "}
        {error instanceof Error ? error.message : "no record found"}
      </p>
    );
  }

  return (
    <VersionForm fieldData={record.fieldData} recordId={record.recordId} />
  );
};
