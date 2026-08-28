/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZTheatres as ZTheatres_generated } from "./generated/Theatres";

export const ZTheatres = ZTheatres_generated;

export type TTheatres = z.infer<typeof ZTheatres>;
