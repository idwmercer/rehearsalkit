/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZDayTimePreferences as ZDayTimePreferences_generated } from "./generated/DayTimePreferences";

export const ZDayTimePreferences = ZDayTimePreferences_generated;

export type TDayTimePreferences = z.infer<typeof ZDayTimePreferences>;
