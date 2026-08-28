/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZProductionMembers as ZProductionMembers_generated } from "./generated/ProductionMembers";

export const ZProductionMembers = ZProductionMembers_generated;

export type TProductionMembers = z.infer<typeof ZProductionMembers>;
