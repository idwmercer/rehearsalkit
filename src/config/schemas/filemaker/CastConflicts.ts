/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZCastConflicts as ZCastConflicts_generated } from "./generated/CastConflicts";

export const ZCastConflicts = ZCastConflicts_generated;

export type TCastConflicts = z.infer<typeof ZCastConflicts>;
