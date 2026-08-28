/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZScenes as ZScenes_generated } from "./generated/Scenes";

export const ZScenes = ZScenes_generated;

export type TScenes = z.infer<typeof ZScenes>;
