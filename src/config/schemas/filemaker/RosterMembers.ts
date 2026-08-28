/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZRosterMembers as ZRosterMembers_generated } from "./generated/RosterMembers";

export const ZRosterMembers = ZRosterMembers_generated;

export type TRosterMembers = z.infer<typeof ZRosterMembers>;
