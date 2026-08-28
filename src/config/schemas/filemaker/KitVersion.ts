/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import { ZKitVersion as ZKitVersion_generated } from "./generated/KitVersion";

export const ZKitVersion = ZKitVersion_generated;

export type TKitVersion = z.infer<typeof ZKitVersion>;
