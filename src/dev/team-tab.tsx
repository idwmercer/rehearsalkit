import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import {
  ProductionMembersLayout,
  ProductionsLayout,
  RosterMembersLayout,
  TheatreMembersLayout,
  TheatresLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";
import { RecordEditModal } from "./record-edit-modal";
import type { DevFieldGroup } from "./record-edit-modal";

const INVITE_STATUS_OPTIONS = ["Pending", "Active", "Suspended"];

const INVITE_STATUS_COLORS: Record<string, string> = {
  Active: "bg-green-100 text-green-700",
  Pending: "bg-orange-100 text-orange-700",
  Suspended: "bg-secondary text-muted-foreground",
};

const PRODUCTION_MEMBER_FIELDS: DevFieldGroup[] = [
  {
    fields: [
      { key: "accountName", kind: "text", label: "Account name" },
      { key: "Email", kind: "text", label: "Email" },
      { key: "Role", kind: "text", label: "Role" },
      { key: "PrivilegeSet", kind: "text", label: "Privilege set" },
      {
        key: "InviteStatus",
        kind: "select",
        label: "Invite status",
        options: INVITE_STATUS_OPTIONS,
      },
    ],
  },
  {
    fields: [
      { key: "idProduction", kind: "text", label: "Show (idProduction)" },
      { key: "idTheatre", kind: "text", label: "Theatre (idTheatre)" },
      {
        key: "idRosterMembers",
        kind: "text",
        label: "Roster member (idRosterMembers)",
      },
    ],
  },
];

const THEATRE_MEMBER_FIELDS: DevFieldGroup[] = [
  {
    fields: [
      { key: "accountName", kind: "text", label: "Account name" },
      { key: "Role", kind: "text", label: "Role" },
      { key: "PrivilegeSet", kind: "text", label: "Privilege set" },
      { key: "idTheatre", kind: "text", label: "Theatre (idTheatre)" },
    ],
  },
];

const ROSTER_MEMBER_FIELDS: DevFieldGroup[] = [
  {
    fields: [
      { key: "nameFirst", kind: "text", label: "First name" },
      { key: "nameLast", kind: "text", label: "Last name" },
      { key: "email", kind: "text", label: "Email" },
      { key: "defaultRole", kind: "text", label: "Default role" },
      { key: "idOwner", kind: "text", label: "Owner (idOwner)" },
    ],
  },
  {
    fields: [{ key: "notes", kind: "textarea", label: "Notes", span2: true }],
  },
];

interface Row {
  recordId: string;
  fieldData: Record<string, string>;
}

interface Column {
  header: string;
  render: (f: Record<string, string>) => ReactNode;
  strong?: boolean;
}

type MemberKind = "productionMember" | "theatreMember" | "rosterMember";
interface SelectedRecord { kind: MemberKind; recordId: string }

const TEAM_QUERY_KEY = ["dev-team-bundle"];

const matchesQuery = (haystack: (string | undefined)[], query: string) =>
  !query || haystack.join(" ").toLowerCase().includes(query);

const rosterName = (f: Record<string, string>) =>
  `${f.nameFirst ?? ""} ${f.nameLast ?? ""}`.trim();

const idCell = (value: string) => (
  <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
    {value}
  </span>
);

const inviteStatusCell = (status: string) => (
  <span
    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
      INVITE_STATUS_COLORS[status] ?? "bg-secondary text-muted-foreground"
    }`}
  >
    {status || "—"}
  </span>
);

const productionMemberColumns = (
  productionsById: Map<string, string>
): Column[] => [
  { header: "Account", render: (f) => f.accountName || "—", strong: true },
  { header: "Email", render: (f) => f.Email || "—" },
  {
    header: "Show",
    render: (f) => productionsById.get(f.idProduction) || "Unknown show",
  },
  { header: "Role", render: (f) => f.Role || "—" },
  { header: "Privilege set", render: (f) => f.PrivilegeSet || "—" },
  { header: "Status", render: (f) => inviteStatusCell(f.InviteStatus) },
  { header: "id", render: (f) => idCell(f.id) },
];

const theatreMemberColumns = (theatresById: Map<string, string>): Column[] => [
  { header: "Account", render: (f) => f.accountName || "—", strong: true },
  {
    header: "Theatre",
    render: (f) => theatresById.get(f.idTheatre) || "Unknown theatre",
  },
  { header: "Role", render: (f) => f.Role || "—" },
  { header: "Privilege set", render: (f) => f.PrivilegeSet || "—" },
  { header: "id", render: (f) => idCell(f.id) },
];

const ROSTER_MEMBER_COLUMNS: Column[] = [
  { header: "Name", render: (f) => rosterName(f) || "—", strong: true },
  { header: "Email", render: (f) => f.email || "—" },
  { header: "Default role", render: (f) => f.defaultRole || "—" },
  { header: "Owner", render: (f) => f.idOwner || "—" },
  { header: "id", render: (f) => idCell(f.id) },
];

const useRecordMutations = (
  layout: {
    update: (args: {
      fieldData: Record<string, string>;
      recordId: string;
    }) => Promise<unknown>;
    delete: (args: { recordId: string }) => Promise<unknown>;
  },
  queryClient: ReturnType<typeof useQueryClient>
) => ({
  remove: useMutation({
    mutationFn: (recordId: string) => layout.delete({ recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY }),
  }),
  update: useMutation({
    mutationFn: ({
      recordId,
      fieldData,
    }: {
      recordId: string;
      fieldData: Record<string, string>;
    }) => layout.update({ fieldData, recordId }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: TEAM_QUERY_KEY }),
  }),
});

const MemberSection = ({
  label,
  columns,
  rows,
  totalCount,
  emptyText,
  onSelect,
}: {
  label: string;
  columns: Column[];
  rows: Row[];
  totalCount: number;
  emptyText: string;
  onSelect: (recordId: string) => void;
}) => (
  <div>
    <div className="mb-3 flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <span className="text-sm text-muted-foreground">
        {rows.length} of {totalCount} records
      </span>
    </div>
    <div className="overflow-x-auto rounded-2xl border border-border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-muted text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {columns.map((c) => (
              <th className="px-4 py-3" key={c.header}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr
              className="cursor-pointer border-t border-border transition-colors hover:bg-gold-100"
              key={m.recordId}
              onClick={() => onSelect(m.recordId)}
            >
              {columns.map((c) => (
                <td
                  className={`px-4 py-3 ${
                    c.strong ? "font-semibold" : "text-muted-foreground"
                  }`}
                  key={c.header}
                >
                  {c.render(m.fieldData)}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                className="px-4 py-10 text-center text-sm text-muted-foreground"
                colSpan={columns.length}
              >
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// Sequential — see ScenesTab for why (single-threaded FM script execution
// behind the WebViewerAdapter; concurrent fmFetch calls queue and stall).
const fetchTeamBundle = async () => {
  const productionMembers = await emptyOnNoRecords(() =>
    ProductionMembersLayout.list()
  );
  const theatreMembers = await emptyOnNoRecords(() =>
    TheatreMembersLayout.list()
  );
  const rosterMembers = await emptyOnNoRecords(() =>
    RosterMembersLayout.list()
  );
  const productions = await emptyOnNoRecords(() => ProductionsLayout.list());
  const theatres = await emptyOnNoRecords(() => TheatresLayout.list());
  return {
    productionMembers: productionMembers.data,
    productions: productions.data,
    rosterMembers: rosterMembers.data,
    theatreMembers: theatreMembers.data,
    theatres: theatres.data,
  };
};

const EYEBROW: Record<MemberKind, string> = {
  productionMember: "Team · ProductionMembers",
  rosterMember: "Team · RosterMembers",
  theatreMember: "Team · TheatreMembers",
};
const GROUPS: Record<MemberKind, DevFieldGroup[]> = {
  productionMember: PRODUCTION_MEMBER_FIELDS,
  rosterMember: ROSTER_MEMBER_FIELDS,
  theatreMember: THEATRE_MEMBER_FIELDS,
};

const modalTitle = (kind: MemberKind, f: Record<string, string>) => {
  if (kind === "rosterMember") {
    return rosterName(f) || "Roster member";
  }
  if (kind === "theatreMember") {
    return f.accountName || "Theatre member";
  }
  return f.accountName || f.Email || "Production member";
};

const TeamRecordModal = ({
  selected,
  row,
  onClose,
  onSave,
  onDelete,
}: {
  selected: SelectedRecord;
  row: Row;
  onClose: () => void;
  onSave: (fieldData: Record<string, string>) => Promise<unknown>;
  onDelete: () => Promise<unknown>;
}) => (
  <RecordEditModal
    eyebrow={EYEBROW[selected.kind]}
    fieldData={row.fieldData}
    groups={GROUPS[selected.kind]}
    onClose={onClose}
    onDelete={onDelete}
    onSave={onSave}
    recordId={row.recordId}
    title={modalTitle(selected.kind, row.fieldData)}
  />
);

export const TeamTab = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SelectedRecord | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryFn: fetchTeamBundle,
    queryKey: TEAM_QUERY_KEY,
  });

  const productionMembers = data?.productionMembers ?? [];
  const theatreMembers = data?.theatreMembers ?? [];
  const rosterMembers = data?.rosterMembers ?? [];
  const productionsById = new Map(
    (data?.productions ?? []).map((p) => [p.fieldData.id, p.fieldData.Title])
  );
  const theatresById = new Map(
    (data?.theatres ?? []).map((t) => [t.fieldData.id, t.fieldData.TheatreName])
  );

  const query = search.toLowerCase();
  const filteredProductionMembers = productionMembers.filter((m) =>
    matchesQuery(
      [
        m.fieldData.accountName,
        m.fieldData.Email,
        m.fieldData.Role,
        productionsById.get(m.fieldData.idProduction),
      ],
      query
    )
  );
  const filteredTheatreMembers = theatreMembers.filter((m) =>
    matchesQuery(
      [
        m.fieldData.accountName,
        m.fieldData.Role,
        theatresById.get(m.fieldData.idTheatre),
      ],
      query
    )
  );
  const filteredRosterMembers = rosterMembers.filter((m) =>
    matchesQuery(
      [
        rosterName(m.fieldData),
        m.fieldData.email,
        m.fieldData.defaultRole,
        m.fieldData.idOwner,
      ],
      query
    )
  );

  const mutationsByKind: Record<
    MemberKind,
    ReturnType<typeof useRecordMutations>
  > = {
    productionMember: useRecordMutations(ProductionMembersLayout, queryClient),
    rosterMember: useRecordMutations(RosterMembersLayout, queryClient),
    theatreMember: useRecordMutations(TheatreMembersLayout, queryClient),
  };
  const rowsByKind: Record<MemberKind, Row[]> = {
    productionMember: productionMembers,
    rosterMember: rosterMembers,
    theatreMember: theatreMembers,
  };

  const selectedRow = selected
    ? rowsByKind[selected.kind].find((m) => m.recordId === selected.recordId)
    : undefined;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <input
          className="w-full max-w-sm rounded-xl border border-border bg-card px-3.5 py-2 text-base focus:outline-none focus:ring-2 focus:ring-primary/40 md:text-sm"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search team by account, email, role, show, or theatre…"
          type="text"
          value={search}
        />
      </div>

      {isLoading && (
        <p className="py-16 text-center text-sm text-muted-foreground">
          Loading team members…
        </p>
      )}
      {isError && (
        <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
          Failed to load team data:{" "}
          {error instanceof Error ? error.message : "unknown error"}
        </p>
      )}

      {!(isLoading || isError) && (
        <div className="space-y-8">
          <MemberSection
            columns={productionMemberColumns(productionsById)}
            emptyText="No production members match your search."
            label="Production Members — per-show invites"
            onSelect={(recordId) =>
              setSelected({ kind: "productionMember", recordId })
            }
            rows={filteredProductionMembers}
            totalCount={productionMembers.length}
          />
          <MemberSection
            columns={theatreMemberColumns(theatresById)}
            emptyText="No theatre members match your search."
            label="Theatre Members — theatre-level access"
            onSelect={(recordId) =>
              setSelected({ kind: "theatreMember", recordId })
            }
            rows={filteredTheatreMembers}
            totalCount={theatreMembers.length}
          />
          <MemberSection
            columns={ROSTER_MEMBER_COLUMNS}
            emptyText="No roster members match your search."
            label="Roster Members — reusable people per owner"
            onSelect={(recordId) =>
              setSelected({ kind: "rosterMember", recordId })
            }
            rows={filteredRosterMembers}
            totalCount={rosterMembers.length}
          />
        </div>
      )}

      {selected && selectedRow && (
        <TeamRecordModal
          onClose={() => setSelected(null)}
          onDelete={() =>
            mutationsByKind[selected.kind].remove.mutateAsync(selected.recordId)
          }
          onSave={(fieldData) =>
            mutationsByKind[selected.kind].update.mutateAsync({
              fieldData,
              recordId: selected.recordId,
            })
          }
          row={selectedRow}
          selected={selected}
        />
      )}
    </section>
  );
};
