/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZSceneCharacters as ZSceneCharacters_generated } from "./generated/SceneCharacters";

export const ZSceneCharacters = ZSceneCharacters_generated;

export type TSceneCharacters = z.infer<typeof ZSceneCharacters>;
