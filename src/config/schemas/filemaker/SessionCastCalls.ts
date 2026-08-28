import type { InferZodPortals } from "@proofkit/fmdapi";
/**
 * Put your custom overrides or transformations here.
 * Changes to this file will NOT be overwritten.
 */
import type { z } from "zod/v4";

import {
  ZCastMembers as ZCastMembers_generated,
  ZSessionCastCalls as ZSessionCastCalls_generated,
} from "./generated/SessionCastCalls";

export const ZCastMembers = ZCastMembers_generated;

export type TCastMembers = z.infer<typeof ZCastMembers>;

export const ZSessionCastCalls = ZSessionCastCalls_generated;

export type TSessionCastCalls = z.infer<typeof ZSessionCastCalls>;

export const ZSessionCastCallsPortals = {
  CastMembers: ZCastMembers,
};

export type TSessionCastCallsPortals = InferZodPortals<
  typeof ZSessionCastCallsPortals
>;
