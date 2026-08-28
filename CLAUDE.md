# RehearsalKit

## Before building the FileMaker data client

When you build this app's Data API client (the `layoutClient`-style wrapper
around ProofKit's FileMaker Data API proxy), read the "FileMaker `_find`/list
empty-result gotcha" entry in the NotePlan note **AreWeAllMet — Kit Data
Layer & File Structure Standards** (`01 PROJECTS/AreWeAllMet/AreWeAllMet_Admin`)
first, and the reference implementation at
`auditionkit-cwp/src/lib/dataApiClient.ts` (`emptyOnNoRecords`) +
`auditionkit-cwp/CLAUDE.md`. Short version: FileMaker reports "zero records
match" as an HTTP error instead of an empty array, and react-query doesn't
clear stale data on a failed background refetch — so an unguarded query can
silently keep showing deleted/filtered-out records forever. Normalize this
inside `find`/`list` themselves from the start, not per call site; AuditionKit
CWP had to retrofit this across ~10 files after hitting the bug in production.

@AGENTS.md
