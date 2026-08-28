/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZCastAssignments as ZCastAssignments_generated } from "./generated/CastAssignments";

export const ZCastAssignments = ZCastAssignments_generated;

export type TCastAssignments = z.infer<typeof ZCastAssignments>;
