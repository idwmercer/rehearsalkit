import { Plus, X } from "lucide-react";
import { useState } from "react";

import type { LookupOption } from "./lookups";

export interface LinkedItem {
  /** Shown under the label, e.g. a call status or conflict reason. */
  detail?: string;
  label: string;
  recordId: string;
}

interface LinkedRecordsPanelProps {
  /** Text for the add button's dropdown, e.g. "Add a character…". */
  addPlaceholder?: string;
  emptyText: string;
  heading: string;
  items: LinkedItem[];
  /** Records that can still be added. Leave `onAdd` out for a read-only list. */
  options?: LookupOption[];
  onAdd?: (value: string) => Promise<unknown>;
  /** Leave out to hide the remove buttons. */
  onRemove?: (recordId: string) => Promise<unknown>;
}

const NO_OPTIONS: LookupOption[] = [];

const errorMessage = (cause: unknown, fallback: string) =>
  cause instanceof Error ? cause.message : fallback;

const selectClass =
  "min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-base md:text-sm focus:border-navy-500 focus:bg-card focus:outline-none focus:ring-4 focus:ring-orange-500/30";

/**
 * A list of records linked to the one being edited, with optional add and
 * remove. Changes save immediately (each is its own FileMaker record), not
 * with the form's Save button.
 */
export const LinkedRecordsPanel = ({
  addPlaceholder = "Add…",
  emptyText,
  heading,
  items,
  options = NO_OPTIONS,
  onAdd,
  onRemove,
}: LinkedRecordsPanelProps) => {
  const [choice, setChoice] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const run = async (action: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setFailure(null);
    try {
      await action();
    } catch (error) {
      setFailure(errorMessage(error, fallback));
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = () => {
    if (!(choice && onAdd)) {
      return;
    }
    run(async () => {
      await onAdd(choice);
      setChoice("");
    }, "Could not add the link.");
  };

  return (
    <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {heading}
      </p>

      {items.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">{emptyText}</p>
      )}
      {items.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {items.map((item) => (
            <li
              key={item.recordId}
              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <span className="font-medium">{item.label}</span>
                {item.detail && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                )}
              </span>
              {onRemove && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => onRemove(item.recordId),
                      "Could not remove the link."
                    )
                  }
                  aria-label={`Remove ${item.label}`}
                  className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {onAdd && (
        <div className="flex items-center gap-2">
          <select
            aria-label={addPlaceholder}
            className={selectClass}
            value={choice}
            onChange={(e) => setChoice(e.target.value)}
          >
            <option value="">{addPlaceholder}</option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy || !choice}
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-3.5 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      )}
      {failure && <p className="mt-2 text-xs text-destructive">{failure}</p>}
    </div>
  );
};
