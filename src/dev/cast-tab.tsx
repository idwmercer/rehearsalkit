import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { CastMembersLayout } from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { NewRecordButton, RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const FIELD_GROUPS: DevFieldGroup[] = [
  {
    fields: [
      { key: "NameFirst", kind: "text", label: "First name" },
      { key: "NameLast", kind: "text", label: "Last name" },
      { key: "Email", kind: "text", label: "Email" },
      { key: "Phone", kind: "text", label: "Phone" },
      { key: "idOwner", kind: "text", label: "Owner (idOwner)" },
      {
        key: "idSuitePerson",
        kind: "text",
        label: "Suite person (idSuitePerson)",
      },
    ],
  },
  {
    fields: [
      {
        key: "ConflictNotes",
        kind: "textarea",
        label: "Conflict notes",
        span2: true,
      },
      {
        key: "GeneralNotes",
        kind: "textarea",
        label: "General notes",
        span2: true,
      },
    ],
  },
];

export const CastTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const { data, isLoading, isError, error } = useQuery({
    queryFn: () =>
      emptyOnNoRecords(() =>
        CastMembersLayout.list({
          sort: [
            { fieldName: "NameLast", sortOrder: "ascend" },
            { fieldName: "NameFirst", sortOrder: "ascend" },
          ],
        })
      ),
    queryKey: ["dev-cast-members"],
  });

  const cast = data?.data ?? [];
  const q = search.toLowerCase();
  const filtered = cast.filter(
    (c) =>
      !q ||
      [
        c.fieldData.NameFirst,
        c.fieldData.NameLast,
        c.fieldData.Email,
        c.fieldData.idOwner,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
  );

  const selected = cast.find((c) => c.recordId === selectedRecordId);

  const updateMutation = useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => CastMembersLayout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-cast-members"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (recordId: string) => CastMembersLayout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-cast-members"] }),
  });

  const createMutation = useMutation({
    mutationFn: (fieldData: Record<string, string>) =>
      CastMembersLayout.create({ fieldData }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["dev-cast-members"] }),
  });

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search cast by name, email, or owner…"
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base md:text-sm focus:border-navy-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-orange-500/30"
        />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} of {cast.length} records
          </span>
          <NewRecordButton
            label="New cast member"
            onClick={() => setCreating(true)}
          />
        </div>
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading cast…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load CastMembers:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!isLoading && !isError && (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Owner account</th>
                <th className="px-4 py-3">Photo</th>
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
                      {f.NameFirst} {f.NameLast}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.Email || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.Phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {f.idOwner || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {f.PhotoBase64 ? (
                        <span className="text-xs font-semibold text-green-700">
                          On file
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          None
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
                    colSpan={6}
                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                  >
                    No cast members match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <RecordEditModal
          eyebrow="Cast member · CastMembers"
          title={
            `${selected.fieldData.NameFirst} ${selected.fieldData.NameLast}`.trim() ||
            "Unnamed cast member"
          }
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

      {creating && (
        <RecordEditModal
          eyebrow="Cast member · CastMembers"
          title="New cast member"
          groups={FIELD_GROUPS}
          onClose={() => setCreating(false)}
          onSave={(fieldData) => createMutation.mutateAsync(fieldData)}
        />
      )}
    </section>
  );
};
