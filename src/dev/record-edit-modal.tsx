import { Plus, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

import { DateInput } from "./date-input";
import type { LookupOption, Lookups } from "./lookups";

export type DevFieldKind =
  | "text"
  | "textarea"
  | "select"
  | "relation"
  | "time"
  | "date";

export interface DevFieldSpec {
  key: string;
  label: string;
  kind: DevFieldKind;
  options?: string[];
  /** For `relation` fields: the name of the list in the modal's `lookups`. */
  lookup?: string;
  /**
   * Shown but not editable, and never sent on save. Use it for calculation
   * fields: FileMaker rejects an update that includes one (error 201, "Field
   * cannot be modified") and the whole save fails.
   */
  readOnly?: boolean;
  span2?: boolean;
}

export interface DevFieldGroup {
  heading?: string;
  fields: DevFieldSpec[];
  columns?: 2 | 3;
}

const GROUP_COLUMN_CLASSES: Record<2 | 3 | "default", string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  default: "grid-cols-1 sm:grid-cols-2",
};

const SYSTEM_FIELDS: { key: string; label: string }[] = [
  { key: "id", label: "id (app UUID)" },
  { key: "z_CreatedBy", label: "Created by" },
  { key: "z_CreationTimestamp", label: "Created at" },
  { key: "z_ModifiedBy", label: "Modified by" },
  { key: "z_ModificationTimestamp", label: "Modified at" },
];

type MTab = "fields" | "system" | "raw";

/**
 * Edit mode needs `recordId`, `fieldData` and `onDelete`. Leave all three out
 * to open the modal in create mode: blank form, no System / Raw JSON tabs, no
 * delete, and blank fields are left out of what `onSave` receives so
 * FileMaker's auto-enter values (id, defaults) still apply to the new record.
 */
interface RecordEditModalProps {
  eyebrow: string;
  title: string;
  recordId?: string;
  fieldData?: Record<string, string | number>;
  groups: DevFieldGroup[];
  /** Extra content shown under the fields when editing (not when creating). */
  children?: ReactNode;
  lookups?: Lookups;
  onClose: () => void;
  onSave: (updated: Record<string, string>) => Promise<unknown>;
  onDelete?: () => Promise<unknown>;
}

const EMPTY_FIELD_DATA: Record<string, string | number> = {};
const EMPTY_LOOKUPS: Lookups = {};

const staticInputClass =
  "rounded-lg border border-input bg-secondary px-3 py-2 text-base md:text-sm text-muted-foreground";
const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm focus:border-navy-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-orange-500/30";

const fieldInputClass = (field: DevFieldSpec) =>
  field.readOnly ? staticInputClass : inputClass;

// What gets sent to FileMaker: read-only (calculation) fields are always left
// out, and a new record also leaves out blank fields so auto-enter values
// (id, defaults) still apply.
const buildPayload = (
  form: Record<string, string>,
  groups: DevFieldGroup[],
  isCreate: boolean
): Record<string, string> => {
  const readOnlyKeys = new Set(
    groups.flatMap((g) => g.fields.filter((f) => f.readOnly).map((f) => f.key))
  );
  return Object.fromEntries(
    Object.entries(form).filter(
      ([key, value]) => !readOnlyKeys.has(key) && !(isCreate && value === "")
    )
  );
};

/**
 * Dropdown of related records. The stored value is the record's id; the
 * person picks by name. A stored id that isn't in the list (deleted record,
 * or one from another show) stays selectable so saving never wipes it.
 */
const RelationSelect = ({
  id,
  options,
  value,
  onChange,
}: {
  id: string;
  options: LookupOption[];
  value: string;
  onChange: (value: string) => void;
}) => {
  const isKnown = options.some((o) => o.value === value);
  return (
    <select
      id={id}
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
      {value && !isKnown && (
        <option value={value}>{`Unknown record (${value})`}</option>
      )}
    </select>
  );
};

export const NewRecordButton = ({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
  >
    <Plus className="h-4 w-4" />
    {label}
  </button>
);

export const RecordEditModal = ({
  eyebrow,
  title,
  recordId,
  fieldData = EMPTY_FIELD_DATA,
  groups,
  children,
  lookups = EMPTY_LOOKUPS,
  onClose,
  onSave,
  onDelete,
}: RecordEditModalProps) => {
  const isCreate = recordId === undefined;
  const editableKeys = groups.flatMap((g) => g.fields.map((f) => f.key));
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(editableKeys.map((k) => [k, String(fieldData[k] ?? "")]))
  );
  const [mtab, setMtab] = useState<MTab>("fields");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await onSave(buildPayload(form, groups, isCreate));
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : `Failed to ${isCreate ? "create record" : "save changes"}.`
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await onDelete();
      onClose();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete record."
      );
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-3xl border border-border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {eyebrow}
            </p>
            <h3 className="mt-0.5 text-lg font-semibold">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-5 border-b border-border px-6">
          {(isCreate
            ? ([["fields", "Fields"]] as [MTab, string][])
            : ([
                ["fields", "Fields"],
                ["system", "System"],
                ["raw", "Raw JSON"],
              ] as [MTab, string][])
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMtab(key)}
              className={`border-b-2 py-3 text-sm font-medium transition-colors ${
                mtab === key
                  ? "border-orange-500 text-navy-500"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {mtab === "fields" && (
            <div className="space-y-6">
              {groups.map((group, gi) => (
                <div key={group.heading ?? gi}>
                  {group.heading && (
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.heading}
                    </p>
                  )}
                  <div
                    className={`grid gap-3.5 ${GROUP_COLUMN_CLASSES[group.columns ?? "default"]}`}
                  >
                    {group.fields.map((f) => (
                      <div
                        key={f.key}
                        className={`group flex flex-col gap-1.5 ${f.span2 ? "col-span-full" : ""}`}
                      >
                        <label
                          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors group-focus-within:text-orange-600"
                          htmlFor={`f-${f.key}`}
                        >
                          {f.label}
                        </label>
                        {f.kind === "textarea" && (
                          <textarea
                            id={`f-${f.key}`}
                            className={`${fieldInputClass(f)} min-h-20 resize-y`}
                            disabled={f.readOnly}
                            value={form[f.key] ?? ""}
                            onChange={(e) => setField(f.key, e.target.value)}
                          />
                        )}
                        {f.kind === "select" && (
                          <select
                            id={`f-${f.key}`}
                            className={inputClass}
                            value={form[f.key] ?? ""}
                            onChange={(e) => setField(f.key, e.target.value)}
                          >
                            <option value="">—</option>
                            {(f.options ?? []).map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        )}
                        {f.kind === "relation" && (
                          <RelationSelect
                            id={`f-${f.key}`}
                            options={lookups[f.lookup ?? ""] ?? []}
                            value={form[f.key] ?? ""}
                            onChange={(v) => setField(f.key, v)}
                          />
                        )}
                        {f.kind === "text" && (
                          <input
                            id={`f-${f.key}`}
                            type="text"
                            className={fieldInputClass(f)}
                            disabled={f.readOnly}
                            value={form[f.key] ?? ""}
                            onChange={(e) => setField(f.key, e.target.value)}
                          />
                        )}
                        {f.kind === "time" && (
                          <input
                            id={`f-${f.key}`}
                            type="time"
                            step="1"
                            className={inputClass}
                            value={form[f.key] ?? ""}
                            onChange={(e) => setField(f.key, e.target.value)}
                          />
                        )}
                        {f.kind === "date" && (
                          <DateInput
                            id={`f-${f.key}`}
                            className={inputClass}
                            value={form[f.key] ?? ""}
                            onChange={(v) => setField(f.key, v)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!isCreate && children}
            </div>
          )}

          {mtab === "system" && (
            <div>
              <p className="mb-4 rounded-xl border border-border bg-muted px-3.5 py-3 text-sm text-muted-foreground">
                These fields are auto-entered by FileMaker and normally hidden
                from end users. Shown here for debugging — not user-editable.
              </p>
              <div className="grid grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Record id (recordId)
                  </span>
                  <input
                    readOnly
                    disabled
                    value={recordId ?? ""}
                    className={staticInputClass}
                  />
                </div>
                {SYSTEM_FIELDS.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {f.label}
                    </span>
                    <input
                      readOnly
                      disabled
                      value={String(fieldData[f.key] ?? "")}
                      className={staticInputClass}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {mtab === "raw" && (
            <pre className="overflow-x-auto rounded-xl bg-navy-700 p-4 font-mono text-xs leading-relaxed text-white/90">
              {JSON.stringify({ fieldData, recordId }, null, 2)}
            </pre>
          )}
        </div>

        {saveError && (
          <p
            role="alert"
            className="border-t border-destructive/30 bg-destructive/5 px-6 py-3 text-sm text-destructive"
          >
            {`Could not ${isCreate ? "create the record" : "save"}: ${saveError}`}
          </p>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div>
            {!(isCreate || confirmingDelete) && (
              <button
                type="button"
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete record
              </button>
            )}
            {!isCreate && confirmingDelete && (
              <div className="flex items-center gap-2 text-sm text-rust-700">
                <span>Delete this record permanently?</span>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="rounded-lg bg-rust-500 px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
                >
                  {deleting ? "Deleting…" : "Yes, delete"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {deleteError && (
              <p className="mt-1 text-xs text-destructive">{deleteError}</p>
            )}
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving && "Saving…"}
              {!saving && (isCreate ? "Create record" : "Save changes")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
