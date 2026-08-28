import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";

import {
  CastAssignmentsLayout,
  CastConflictsLayout,
  CastMembersLayout,
  ProductionMembersLayout,
  ProductionsLayout,
  RehearsalSessionsLayout,
  TheatresLayout,
} from "../config/schemas/filemaker/client";
import { emptyOnNoRecords } from "../lib/data";

const maskEmail = (email: string) => {
  if (!email || !email.includes("@")) {
    return email || "—";
  }
  const [user, domain] = email.split("@");
  const visible = user.slice(0, Math.min(3, user.length));
  return `${visible}${"•".repeat(Math.max(3, user.length - visible.length))}@${domain}`;
};

// FileMaker's Data API returns timestamps as "MM/DD/YYYY HH:MM:SS" (US
// locale, space-separated) — not ISO 8601. Parse the parts directly instead
// of handing the raw string to `new Date()`.
const FM_TIMESTAMP_PATTERN =
  /^(?<month>\d{1,2})\/(?<day>\d{1,2})\/(?<year>\d{4})(?:\s+(?<hour>\d{1,2}):(?<minute>\d{2}):(?<second>\d{2}))?$/u;

const parseFmTimestamp = (value: string): Date | null => {
  const match = value.match(FM_TIMESTAMP_PATTERN);
  if (!match?.groups) {
    return null;
  }
  const { month, day, year, hour, minute, second } = match.groups;
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    hour ? Number(hour) : 0,
    minute ? Number(minute) : 0,
    second ? Number(second) : 0
  );
  return Number.isNaN(date.getTime()) ? null : date;
};

const relativeTime = (isoLike: string) => {
  if (!isoLike) {
    return "—";
  }
  const then = parseFmTimestamp(isoLike);
  if (!then) {
    return isoLike;
  }
  const diffMs = Date.now() - then.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) {
    return "just now";
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hours = Math.round(mins / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

type Severity = "ok" | "notice" | "warn" | "crit";
const SEV_DOT: Record<Severity, string> = {
  crit: "bg-rust-500",
  notice: "bg-navy-500",
  ok: "bg-[#758e4f]",
  warn: "bg-orange-500",
};

type DashboardNavTarget =
  | "theatres"
  | "shows"
  | "cast"
  | "assignments"
  | "conflicts"
  | "team";

interface DashboardTabProps {
  onNavigate: (tab: DashboardNavTarget) => void;
}

// Sequential — WebViewerAdapter scripts execute single-threaded in FileMaker.
const fetchDashboard = async () => {
  const productions = await emptyOnNoRecords(() => ProductionsLayout.list());
  const castMembers = await emptyOnNoRecords(() => CastMembersLayout.list());
  const assignments = await emptyOnNoRecords(() =>
    CastAssignmentsLayout.list()
  );
  const conflicts = await emptyOnNoRecords(() => CastConflictsLayout.list());
  const sessions = await emptyOnNoRecords(() => RehearsalSessionsLayout.list());
  const members = await emptyOnNoRecords(() => ProductionMembersLayout.list());
  const theatres = await emptyOnNoRecords(() => TheatresLayout.list());
  return {
    assignments: assignments.data,
    castMembers: castMembers.data,
    conflicts: conflicts.data,
    members: members.data,
    productions: productions.data,
    sessions: sessions.data,
    theatres: theatres.data,
  };
};

export const DashboardTab = ({ onNavigate }: DashboardTabProps) => {
  const accountsPanelRef = useRef<HTMLDivElement>(null);
  const [highlightAccounts, setHighlightAccounts] = useState(false);

  const scrollToAccounts = useCallback(() => {
    accountsPanelRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    setHighlightAccounts(true);
    window.setTimeout(() => setHighlightAccounts(false), 1600);
  }, []);

  const { data, isLoading, isError, error } = useQuery({
    queryFn: fetchDashboard,
    queryKey: ["dev-dashboard"],
  });

  if (isLoading) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        Loading dashboard…
      </p>
    );
  }
  if (isError || !data) {
    return (
      <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        Failed to load dashboard data:{" "}
        {error instanceof Error ? error.message : "unknown error"}
      </p>
    );
  }

  const {
    productions,
    castMembers,
    assignments,
    conflicts,
    sessions,
    members,
    theatres,
  } = data;

  const productionIds = new Set(productions.map((p) => p.fieldData.id));
  const castMemberIds = new Set(castMembers.map((c) => c.fieldData.id));
  const orphanedAssignments = assignments.filter(
    (a) =>
      !productionIds.has(a.fieldData.idProduction) ||
      !castMemberIds.has(a.fieldData.idCastMember)
  );
  const showsMissingOwner = productions.filter((p) => !p.fieldData.idOwner);
  const pendingInvites = members.filter(
    (m) => m.fieldData.InviteStatus === "Pending"
  );
  const autoSessions = sessions.filter((s) =>
    Number(s.fieldData.isAutoGenerated)
  );

  const owners = new Set([
    ...productions.map((p) => p.fieldData.idOwner).filter(Boolean),
    ...castMembers.map((c) => c.fieldData.idOwner).filter(Boolean),
  ]);

  const accounts = [...owners].map((owner) => {
    const ownedShows = productions.filter((p) => p.fieldData.idOwner === owner);
    const ownedCast = castMembers.filter((c) => c.fieldData.idOwner === owner);
    const lastActivity = [...ownedShows, ...ownedCast]
      .map((r) => r.fieldData.z_ModificationTimestamp)
      .filter(Boolean)
      .toSorted()
      .at(-1);
    return { lastActivity, owner, showCount: ownedShows.length };
  });
  accounts.sort((a, b) =>
    (b.lastActivity ?? "").localeCompare(a.lastActivity ?? "")
  );

  const portalOn = productions.filter((p) =>
    Number(p.fieldData.isActorPortalEnabled)
  ).length;

  const productionsById = new Map(
    productions.map((p) => [p.fieldData.id, p.fieldData.Title])
  );
  const castMembersById = new Map(
    castMembers.map((c) => [
      c.fieldData.id,
      `${c.fieldData.NameFirst} ${c.fieldData.NameLast}`.trim(),
    ])
  );

  interface FeedItem {
    text: string;
    when: string;
  }
  const feed: FeedItem[] = [
    ...productions.map((p) => ({
      text: `Show edited — ${p.fieldData.Title || "Untitled"}`,
      when: p.fieldData.z_ModificationTimestamp,
    })),
    ...castMembers.map((c) => ({
      text: `Cast member edited — ${c.fieldData.NameFirst} ${c.fieldData.NameLast}`.trim(),
      when: c.fieldData.z_ModificationTimestamp,
    })),
    ...sessions.map((s) => ({
      text: `Rehearsal edited — ${s.fieldData.SessionType || "Session"} · ${
        productionsById.get(s.fieldData.idProduction) || "Unknown show"
      }`,
      when: s.fieldData.z_ModificationTimestamp,
    })),
  ]
    .filter((item) => item.when)
    .toSorted((a, b) => b.when.localeCompare(a.when))
    .slice(0, 6);

  const alerts: { sev: Severity; text: ReactNode; meta: string }[] = [
    {
      meta: `Checked on load · ${assignments.length - orphanedAssignments.length} of ${assignments.length} rows valid`,
      sev: orphanedAssignments.length ? "crit" : "ok",
      text:
        orphanedAssignments.length === 0 ? (
          <>
            <b>No orphaned cast assignments.</b> Every CastAssignments row
            resolves to a real Productions and CastMembers record.
          </>
        ) : (
          <>
            <b>
              {orphanedAssignments.length} orphaned cast{" "}
              {orphanedAssignments.length === 1 ? "assignment" : "assignments"}.
            </b>{" "}
            References a Productions or CastMembers record that no longer
            exists.
          </>
        ),
    },
    {
      meta: "Checked on load",
      sev: showsMissingOwner.length ? "warn" : "ok",
      text:
        showsMissingOwner.length === 0 ? (
          <>
            <b>No shows missing an owner.</b> idOwner is populated on all{" "}
            {productions.length} Productions records.
          </>
        ) : (
          <>
            <b>{showsMissingOwner.length} show(s) missing idOwner</b> —{" "}
            {showsMissingOwner.map((p) => p.fieldData.Title).join(", ")}.
          </>
        ),
    },
    {
      meta: "RehearsalSessions · isAutoGenerated = 1",
      sev: "notice",
      text: (
        <>
          <b>
            {autoSessions.length} of {sessions.length} sessions are
            scheduler-generated
          </b>{" "}
          — the rest were added by hand.
        </>
      ),
    },
    {
      meta: "ProductionMembers · InviteStatus = Pending",
      sev: pendingInvites.length ? "warn" : "ok",
      text:
        pendingInvites.length === 0 ? (
          <b>No pending team invites.</b>
        ) : (
          <>
            <b>
              {pendingInvites.length} pending team invite
              {pendingInvites.length === 1 ? "" : "s"}.
            </b>{" "}
            May need a resend or manual follow-up.
          </>
        ),
    },
  ];

  const tiles: {
    label: string;
    sub: string;
    value: number;
    target: DashboardNavTarget | null;
    flag?: boolean;
  }[] = [
    {
      label: "Accounts",
      sub: "distinct show/cast owners",
      target: null,
      value: accounts.length,
    },
    {
      label: "Theatres",
      sub: "in Theatres table",
      target: "theatres",
      value: theatres.length,
    },
    {
      label: "Shows",
      sub: `across ${new Set(productions.map((p) => p.fieldData.Season)).size} seasons`,
      target: "shows",
      value: productions.length,
    },
    {
      label: "Cast",
      sub: "in CastMembers table",
      target: "cast",
      value: castMembers.length,
    },
    {
      label: "Assignments",
      sub: "cast × character rows",
      target: "assignments",
      value: assignments.length,
    },
    {
      flag: conflicts.length > 0,
      label: "Conflicts",
      sub: conflicts.length ? "logged" : "none logged",
      target: "conflicts",
      value: conflicts.length,
    },
  ];

  return (
    <section>
      <div className="mb-7 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <button
            key={tile.label}
            type="button"
            onClick={() =>
              tile.target ? onNavigate(tile.target) : scrollToAccounts()
            }
            className="group relative rounded-2xl border border-border bg-card p-4.5 text-left transition-all hover:-translate-y-0.5 hover:border-navy-300 hover:shadow-md"
          >
            <ArrowUpRight className="absolute right-3.5 top-3.5 h-3.5 w-3.5 text-navy-500 opacity-0 transition-opacity group-hover:opacity-100" />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className="mt-1.5 text-3xl font-semibold tracking-tight">
              {tile.value}
            </p>
            <p
              className={`mt-1 text-xs ${tile.flag ? "font-medium text-rust-500" : "text-muted-foreground"}`}
            >
              {tile.sub}
            </p>
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Data integrity checks
            </p>
            <div className="divide-y divide-border">
              {alerts.map((a, i) => (
                <div key={i} className="flex gap-3 py-2.5 first:pt-0">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${SEV_DOT[a.sev]}`}
                  />
                  <div>
                    <p className="text-sm leading-relaxed">{a.text}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {a.meta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recent activity
            </p>
            {feed.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No recent activity found.
              </p>
            )}
            <div className="divide-y divide-border">
              {feed.map((item, i) => (
                <div key={i} className="flex gap-3 py-2.5 text-sm first:pt-0">
                  <span className="w-16 shrink-0 pt-0.5 text-xs text-muted-foreground">
                    {relativeTime(item.when)}
                  </span>
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-navy-300" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div
            ref={accountsPanelRef}
            className={`rounded-2xl border bg-card p-5 transition-shadow duration-700 ${
              highlightAccounts
                ? "border-navy-500 shadow-[0_0_0_3px_rgba(20,65,97,0.15)]"
                : "border-border"
            }`}
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Accounts
            </p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="pb-2">Account</th>
                  <th className="pb-2">Shows</th>
                  <th className="pb-2">Last active</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((acct) => (
                  <tr key={acct.owner} className="border-t border-border">
                    <td className="py-2 pr-2">{maskEmail(acct.owner)}</td>
                    <td className="py-2 pr-2">{acct.showCount}</td>
                    <td className="py-2 text-muted-foreground">
                      {acct.lastActivity
                        ? relativeTime(acct.lastActivity)
                        : "—"}
                    </td>
                  </tr>
                ))}
                {accounts.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="py-6 text-center text-muted-foreground"
                    >
                      No accounts found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <p className="mt-3 text-xs text-muted-foreground">
              Emails partially masked in this view. Full value is visible from
              the edit modal on the owning record.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Snapshot
            </p>
            <div className="space-y-2.5 text-sm">
              <div className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-navy-500" />
                <span>
                  Actor portal is <b>enabled</b> on {portalOn} of{" "}
                  {productions.length} shows.
                </span>
              </div>
              <div className="flex gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-navy-300" />
                <span>
                  {castMembersById.size} cast members across{" "}
                  {productionsById.size} shows.
                </span>
              </div>
              <div className="flex gap-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${pendingInvites.length ? "bg-orange-500" : "bg-[#758e4f]"}`}
                />
                <span>
                  {pendingInvites.length} pending team invite
                  {pendingInvites.length === 1 ? "" : "s"} across all shows.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
