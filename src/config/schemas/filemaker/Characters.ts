/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZCharacters as ZCharacters_generated } from "./generated/Characters";

export const ZCharacters = ZCharacters_generated;

export type TCharacters = z.infer<typeof ZCharacters>;
