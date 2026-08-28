import { fmFetch } from "@proofkit/webviewer";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Mail,
  MapPin,
  User,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { z } from "zod";

import navIcon from "./assets/AppBannerDark.png";
import idIcon from "./assets/ID Icon.png";
import rehearsalKitLogo from "./assets/RKLogo.png";
import { AssignmentsTab } from "./dev/assignments-tab";
import { BlackoutsTab } from "./dev/blackouts-tab";
import { CastTab } from "./dev/cast-tab";
import { ConflictsTab } from "./dev/conflicts-tab";
import { DashboardTab } from "./dev/dashboard-tab";
import { PreferencesTab } from "./dev/preferences-tab";
import { RehearsalsTab } from "./dev/rehearsals-tab";
import { ScenesTab } from "./dev/scenes-tab";
import { ShowsTab } from "./dev/shows-tab";
import { TeamTab } from "./dev/team-tab";
import { TheatresTab } from "./dev/theatres-tab";
import { VersionTab } from "./dev/version-tab";
import { LogoutPage } from "./routes/logout";

type TabKey =
  | "dashboard"
  | "theatres"
  | "shows"
  | "scenes"
  | "rehearsals"
  | "assignments"
  | "cast"
  | "conflicts"
  | "preferences"
  | "blackouts"
  | "team"
  | "version";

interface TabSpec {
  key: TabKey;
  label: string;
}

const TABS: TabSpec[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "theatres", label: "Theatres" },
  { key: "shows", label: "Shows" },
  { key: "scenes", label: "Scenes" },
  { key: "rehearsals", label: "Rehearsals" },
  { key: "assignments", label: "Assignments" },
  { key: "cast", label: "Cast" },
  { key: "conflicts", label: "Conflicts" },
  { key: "preferences", label: "Preferences" },
  { key: "blackouts", label: "Blackouts" },
  { key: "team", label: "Team" },
  { key: "version", label: "Version" },
];

const initialPropsSchema = z.object({ accountName: z.string().optional() });

export const DevApp = () => {
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [showAbout, setShowAbout] = useState(false);
  const [showLogout, setShowLogout] = useState(false);

  const { data: accountName } = useQuery({
    queryFn: async () => {
      const result = await fmFetch("GetInitialProps", {});
      const parsed = initialPropsSchema.safeParse(result);
      return parsed.success ? (parsed.data.accountName ?? null) : null;
    },
    queryKey: ["dev-account-name"],
  });

  // Same back/forward pattern as the AuditionKitDev console (dev-app.tsx),
  // operating over tab changes since this console has no router.
  const stack = useRef<TabKey[]>(["dashboard"]);
  const cursor = useRef(0);
  const [canBack, setCanBack] = useState(false);
  const [canForward, setCanForward] = useState(false);

  const navigateTab = (next: TabKey) => {
    if (stack.current[cursor.current] === next) {
      return;
    }
    stack.current = stack.current.slice(0, cursor.current + 1);
    stack.current.push(next);
    cursor.current = stack.current.length - 1;
    setTab(next);
    setCanBack(cursor.current > 0);
    setCanForward(false);
  };

  const goBack = () => {
    if (cursor.current <= 0) {
      return;
    }
    cursor.current -= 1;
    setTab(stack.current[cursor.current]);
    setCanBack(cursor.current > 0);
    setCanForward(true);
  };

  const goForward = () => {
    if (cursor.current >= stack.current.length - 1) {
      return;
    }
    cursor.current += 1;
    setTab(stack.current[cursor.current]);
    setCanBack(true);
    setCanForward(cursor.current < stack.current.length - 1);
  };

  if (showLogout) {
    return <LogoutPage />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {showAbout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex justify-end px-4 pt-4">
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-5 px-8 pb-10 text-center">
              <img
                src={rehearsalKitLogo}
                alt="RehearsalKit"
                className="w-56 select-none"
              />
              <img
                src={idIcon}
                alt="Informing Designs"
                className="w-20 select-none"
              />
              <div className="space-y-1">
                <p className="text-lg font-semibold">Informing Designs, LLC</p>
                <a
                  href="mailto:support@informingdesigns.com"
                  className="flex items-center justify-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Mail className="h-3.5 w-3.5" />
                  support@informingdesigns.com
                </a>
                <p className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  Austin, TX
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Build{" "}
                  {new Date(__BUILD_TIME__).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-navy-500">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-6 py-3 sm:px-10">
          <button
            type="button"
            onClick={() => setShowAbout(true)}
            className="shrink-0 rounded-lg p-0.5 hover:opacity-75 transition-opacity"
            aria-label="About Informing Designs"
          >
            <img
              src={navIcon}
              alt="Informing Designs"
              className="h-12 w-auto"
            />
          </button>
          <div className="flex-1" />
          {accountName && (
            <>
              <div className="flex items-center gap-1.5 text-sm text-white/80">
                <User className="h-3.5 w-3.5" />
                {accountName}
              </div>
              <div className="mx-1 h-4 w-px bg-white/25" />
            </>
          )}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={goBack}
              disabled={!canBack}
              aria-label="Go back"
              className="rounded-lg p-1.5 text-white/90 transition-colors disabled:opacity-30 disabled:cursor-default hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goForward}
              disabled={!canForward}
              aria-label="Go forward"
              className="rounded-lg p-1.5 text-white/90 transition-colors disabled:opacity-30 disabled:cursor-default hover:bg-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="mx-1 h-4 w-px bg-white/25" />
            <button
              type="button"
              onClick={() => setShowLogout(true)}
              aria-label="Log out"
              title="Log out"
              className="rounded-lg p-1.5 text-white/90 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-10">
        <div className="mb-1 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
              RehearsalKit
            </p>
            <div className="mt-1 flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                Developer Console
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rust-500 bg-rust-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-rust-700">
                <span className="h-1.5 w-1.5 rounded-full bg-rust-500" />
                Dev only
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-green-600 shadow-[0_0_0_3px_rgba(117,142,79,0.2)]" />
            Connected:{" "}
            <strong className="text-foreground">RehearsalKit_MASTER</strong>
          </div>
        </div>

        <nav className="mb-8 mt-4 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => navigateTab(t.key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-navy-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {tab === "dashboard" && <DashboardTab onNavigate={navigateTab} />}
        {tab === "theatres" && <TheatresTab />}
        {tab === "shows" && <ShowsTab />}
        {tab === "scenes" && <ScenesTab />}
        {tab === "rehearsals" && <RehearsalsTab />}
        {tab === "assignments" && <AssignmentsTab />}
        {tab === "cast" && <CastTab />}
        {tab === "conflicts" && <ConflictsTab />}
        {tab === "preferences" && <PreferencesTab />}
        {tab === "blackouts" && <BlackoutsTab />}
        {tab === "team" && <TeamTab />}
        {tab === "version" && <VersionTab />}
      </main>
    </div>
  );
};
