# RehearsalKit

AuditionKit-companion app for scheduling rehearsals — building toward
generating a rehearsal calendar from actor conflicts, a director's date
window and avoid-target preferences, and a scene/cast breakdown. Built on
ProofKit (`@proofkit/fmdapi`, `@proofkit/webviewer`) against a FileMaker
backend, with TanStack Router/Query on the frontend.

Currently an early scaffold — only a `query-demo` route exists so far, no
real form fields or FileMaker-backed screens have been built yet.

## Dependencies

Does **not** currently depend on `@informing-designs/design-system`
(`~/Projects/id-design-system`) — no entry in `package.json`, nothing
installed. When this app eventually adopts it, check that the `ModalOverlay`
focus-stealing fix (commit `777a05a`, 2026-08-16) is included before
building any modal — earlier versions of `ModalOverlay` steal input focus
on every keystroke inside the modal.

## Scripts

- `pnpm dev` — start the Vite dev server
- `pnpm build` — production build
- `pnpm deploy` — `proofkit deploy`
- `pnpm typegen` — regenerate FileMaker types from `proofkit.config.json`
- `pnpm check` / `pnpm fix` — Ultracite lint/format
