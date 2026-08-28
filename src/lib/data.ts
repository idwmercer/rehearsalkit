import { FileMakerError } from "@proofkit/fmdapi";

/**
 * FileMaker's Data API reports "zero records match" as its own error 401
 * ("No records match the request") instead of a 200 with an empty array.
 * Normalize that here so no query/list call site has to know it's a
 * FileMaker quirk. See CLAUDE.md — "Before building the FileMaker data
 * client" — this is the centralized guard that entry describes.
 */
const NO_RECORDS_CODE = "401";

export const emptyOnNoRecords = async <T extends { data: unknown[] }>(
  run: () => Promise<T>
): Promise<T> => {
  try {
    return await run();
  } catch (error) {
    if (error instanceof FileMakerError && error.code === NO_RECORDS_CODE) {
      return { data: [] } as unknown as T;
    }
    throw error;
  }
};
