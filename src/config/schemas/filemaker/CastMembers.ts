/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZCastMembers as ZCastMembers_generated } from "./generated/CastMembers";

export const ZCastMembers = ZCastMembers_generated;

export type TCastMembers = z.infer<typeof ZCastMembers>;
