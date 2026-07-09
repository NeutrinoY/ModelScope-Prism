# ModelScope Prism

ModelScope Prism is a lightweight, local-first Web workspace for calling
ModelScope API-Inference with your own ModelScope Access Token.

The current branch contains the initial runtime rebuild baseline:

```text
Chat       OpenAI-compatible streamed conversation
Vision     The same Conversation runtime with image_url inputs
AIGC       ModelScope async image generation and task polling
Settings   Local token, model defaults, theme, import/export
Sessions   Local-first workspace history
```

The rebuild documents in `docs/rebuild/` remain the engineering guide. They
define the intended product boundaries, contracts, storage semantics, provider
organization, and dependency rules. They are used as a practical engineering
reference, with runtime behavior, data safety, and parameter semantics treated
as the strict parts.

## Project Shape

```text
docs/rebuild          Rebuild direction and implementation contracts
legacy-reference      Previous implementation snapshot for reference only
src/app               Next.js App Router and API routes
src/features          Chat, Vision, AIGC, Settings, Sessions workspaces
src/components        Layout, primitives, and cross-feature components
src/lib               Contracts, domain rules, providers, storage, services, config
scripts/probe         Offline model capability diagnostics
scripts/smoke.mjs     Minimal upstream connectivity smoke check
```

The previous implementation is available under `legacy-reference/implementation`
for semantic and upstream-call reference, but it is not the target architecture.

## Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm typecheck
pnpm build
pnpm smoke
pnpm probe <model-id>
```

`pnpm smoke` and `pnpm probe` call ModelScope and may consume quota. They require
`MS_API_KEY` or `MODELSCOPE_API_KEY` in the environment or `.env.local`.

## Runtime Rules

```text
UI defaults are not request defaults.
Auto means do not send control parameters.
Runtime does not probe.
Failures are surfaced; runtime does not silently switch parameter formats.
Built-in model profiles can restrict known capabilities.
Custom model IDs are allowed to try explicit capabilities.
```

## Current Status

See `docs/rebuild/status.md` for the current rebuild status, accepted tradeoffs,
and near-term engineering polish items.
