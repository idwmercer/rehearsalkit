import { useMutation, useQueryClient } from "@tanstack/react-query";

import { RehearsalSessionScenesLayout } from "../config/schemas/filemaker/client";
import { LinkedRecordsPanel } from "./linked-records-panel";

export const REHEARSALS_QUERY_KEY = ["dev-rehearsals-bundle"];

interface SessionScenesSectionProps {
  productionId: string;
  scenes: {
    fieldData: { Title: string; id: string; idProduction: string };
  }[];
  sessionId: string;
  sessionScenes: {
    fieldData: { idScene: string; idSession: string };
    recordId: string;
  }[];
}

// Which scenes a session works on. Each add / remove is its own
// RehearsalSessionScenes record, saved straight away. Only scenes from the
// session's own show can be added. Note this does not touch the cast calls;
// those come from the "Confirm/Place Session" script.
export const SessionScenesSection = ({
  productionId,
  scenes,
  sessionId,
  sessionScenes,
}: SessionScenesSectionProps) => {
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: REHEARSALS_QUERY_KEY });

  const addMutation = useMutation({
    mutationFn: (idScene: string) =>
      RehearsalSessionScenesLayout.create({
        fieldData: { idScene, idSession: sessionId },
      }),
    onSuccess: refresh,
  });
  const removeMutation = useMutation({
    mutationFn: (recordId: string) =>
      RehearsalSessionScenesLayout.delete({ recordId }),
    onSuccess: refresh,
  });

  const titleById = new Map(
    scenes.map((s) => [s.fieldData.id, s.fieldData.Title])
  );
  const links = sessionScenes.filter(
    (l) => l.fieldData.idSession === sessionId
  );
  const linkedIds = new Set(links.map((l) => l.fieldData.idScene));

  return (
    <LinkedRecordsPanel
      addPlaceholder="Add a scene…"
      emptyText="No scenes linked to this session yet."
      heading="Scenes in this session"
      items={links.map((l) => ({
        label: titleById.get(l.fieldData.idScene) ?? "Unknown scene",
        recordId: l.recordId,
      }))}
      onAdd={(idScene) => addMutation.mutateAsync(idScene)}
      onRemove={(recordId) => removeMutation.mutateAsync(recordId)}
      options={scenes
        .filter(
          (s) =>
            s.fieldData.idProduction === productionId &&
            !linkedIds.has(s.fieldData.id)
        )
        .map((s) => ({ label: s.fieldData.Title, value: s.fieldData.id }))}
    />
  );
};

interface SessionCallsSectionProps {
  calls: {
    fieldData: {
      CallStatus: string;
      ConflictReason: string;
      idCastMember: string;
      idSession: string;
    };
    recordId: string;
  }[];
  castMembers: {
    fieldData: { id: string; NameFirst: string; NameLast: string };
  }[];
  sessionId: string;
}

const callDetail = (status: string, conflict: string) =>
  [status, conflict && `Conflict: ${conflict}`].filter(Boolean).join(" · ");

// Who is called to a session, read-only. Calls are created by the
// "Confirm/Place Session" script, which also flags conflicts.
export const SessionCallsSection = ({
  calls,
  castMembers,
  sessionId,
}: SessionCallsSectionProps) => {
  const nameById = new Map(
    castMembers.map((m) => [
      m.fieldData.id,
      `${m.fieldData.NameFirst} ${m.fieldData.NameLast}`.trim(),
    ])
  );
  return (
    <LinkedRecordsPanel
      emptyText="No cast calls yet. The Confirm/Place Session script creates them."
      heading="Cast calls (read-only)"
      items={calls
        .filter((c) => c.fieldData.idSession === sessionId)
        .map((c) => ({
          detail: callDetail(
            c.fieldData.CallStatus,
            c.fieldData.ConflictReason
          ),
          label:
            nameById.get(c.fieldData.idCastMember) ?? "Unknown cast member",
          recordId: c.recordId,
        }))}
    />
  );
};

interface SessionLinksProps {
  data:
    | {
        calls: SessionCallsSectionProps["calls"];
        castMembers: SessionCallsSectionProps["castMembers"];
        scenes: SessionScenesSectionProps["scenes"];
        sessionScenes: SessionScenesSectionProps["sessionScenes"];
      }
    | undefined;
  productionId: string;
  sessionId: string;
}

// Everything linked to one session: its scenes (editable) and its cast calls
// (read-only). Takes the tab's whole query result so the tab itself stays small.
export const SessionLinks = ({
  data,
  productionId,
  sessionId,
}: SessionLinksProps) => (
  <>
    <SessionScenesSection
      productionId={productionId}
      scenes={data?.scenes ?? []}
      sessionId={sessionId}
      sessionScenes={data?.sessionScenes ?? []}
    />
    <SessionCallsSection
      calls={data?.calls ?? []}
      castMembers={data?.castMembers ?? []}
      sessionId={sessionId}
    />
  </>
);
