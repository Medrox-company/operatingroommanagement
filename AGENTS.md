<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Timeline design handoff — 2026-10-21

Before continuing timeline or large-screen design work, read `docs/design/timeline-2026-10-21/README.md` and its visual references. Preserve the real application's workflow/status colors from hospital configuration and the existing left navigation menu. The latest three image proposals are alternatives; none has been selected or authorized for implementation. The user requested design proposals only. The handoff records preferences, earlier alternatives, source references, existing implementation entry points, and the branch/worktree state.

## Mobile Cliniq direction — 2026-10-07

The user asks to transfer the Editor aplikace Operatingroom design into Operatingroom Management. Mobile defaults to a quiet light blue-grey mist theme while explicit saved dark/light preferences persist. Room cards use gentle whole-surface gradients from the hospital's actual workflow colors, complete names, a named phase, and two compact side-by-side time metrics. Offer persisted two-column and horizontal-card layouts. Keep clinical callbacks, permissions, phase logic, long-press quick actions, emergency priority and desktop layout. The isolated `scripts/cliniq-preview` uses synthetic data and aliases only within its own Vite config; it must never import production credentials or send clinical changes. Its circular detail is a design demonstration, separate from the production clinical detail.

## Correction — additional design, 2026-10-07

Cliniq is an OPTIONAL appearance of the existing functional mobile app, never a replacement app or fixture. Original design and original theme defaults remain the default. Persist `or-app-design` independently of light/dark. Both designs use the same authenticated App, providers, room data, permissions, navigation, handlers and clinical detail. Apply Cliniq via `html[data-app-design="cliniq"]` only. A synthetic design study is QA material, not the app to present as the result.
