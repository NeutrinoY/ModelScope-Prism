# ModelScope Prism

This branch is a rebuild handoff skeleton.

The previous implementation has been copied to:

```text
D:\Code\ModelScope-Prism__legacy_20260709
```

Start implementation from:

```text
docs/rebuild/11-implementation-brief.md
```

Then follow the supporting rebuild documents in `docs/rebuild/`.

## Current State

This repository intentionally contains:

```text
docs/rebuild          Rebuild handoff documents
legacy-reference      Previous implementation snapshot for reference only
src/app               Minimal Next.js scaffold
src/features          Feature entry folders
src/components        Shared UI/layout/component folders
src/lib               Contracts, domain, provider, storage, services, config
scripts               Local developer scripts placeholder
```

The old app implementation is no longer part of the runtime scaffold.

The previous implementation is available under `legacy-reference/implementation` for reference,
but it must not be treated as the target architecture.

## Commands

```bash
pnpm install
pnpm dev
pnpm check
pnpm typecheck
pnpm build
```

## Implementation Rule

Do not infer behavior from this scaffold. Use the rebuild documents as the source of truth,
especially the explicit parameter sending rule:

```text
UI defaults are not request defaults.
Auto means do not send control parameters.
Runtime does not probe.
```
