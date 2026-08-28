/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZTheatreMembers as ZTheatreMembers_generated } from "./generated/TheatreMembers";

export const ZTheatreMembers = ZTheatreMembers_generated;

export type TTheatreMembers = z.infer<typeof ZTheatreMembers>;
