/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZRehearsalSessionScenes as ZRehearsalSessionScenes_generated } from "./generated/RehearsalSessionScenes";

export const ZRehearsalSessionScenes = ZRehearsalSessionScenes_generated;

export type TRehearsalSessionScenes = z.infer<typeof ZRehearsalSessionScenes>;
