import type { InferZodPortals } from "@proofkit/fmdapi";
/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import {
  ZCastAssignments as ZCastAssignments_generated,
  ZCharacters as ZCharacters_generated,
  ZRehearsalSessions as ZRehearsalSessions_generated,
  ZProductions as ZProductions_generated,
} from "./generated/Productions";

export const ZCastAssignments = ZCastAssignments_generated;

export type TCastAssignments = z.infer<typeof ZCastAssignments>;

export const ZCharacters = ZCharacters_generated;

export type TCharacters = z.infer<typeof ZCharacters>;

export const ZRehearsalSessions = ZRehearsalSessions_generated;

export type TRehearsalSessions = z.infer<typeof ZRehearsalSessions>;

export const ZProductions = ZProductions_generated;

export type TProductions = z.infer<typeof ZProductions>;

export const ZProductionsPortals = {
  CastAssignments: ZCastAssignments,
  Characters: ZCharacters,
  RehearsalSessions: ZRehearsalSessions,
};

export type TProductionsPortals = InferZodPortals<typeof ZProductionsPortals>;
