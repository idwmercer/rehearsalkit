/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZBlackouts as ZBlackouts_generated } from "./generated/Blackouts";

export const ZBlackouts = ZBlackouts_generated;

export type TBlackouts = z.infer<typeof ZBlackouts>;
