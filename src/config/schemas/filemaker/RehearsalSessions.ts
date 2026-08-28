import type { z } from "zod/v4";

/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import { ZRehearsalSessions as ZRehearsalSessions_generated } from "./generated/RehearsalSessions";

export const ZRehearsalSessions = ZRehearsalSessions_generated;

export type TRehearsalSessions = z.infer<typeof ZRehearsalSessions>;

// NOTE: RehearsalSessions_api currently exposes no portal. When a
// SessionCastCalls portal is added to that layout in FileMaker and
// typegen is re-run, restore ZRehearsalSessionsPortals here.
