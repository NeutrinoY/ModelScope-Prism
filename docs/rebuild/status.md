# Rebuild Status

## Baseline

The initial runtime rebuild baseline is committed as:

```text
c100260c refactor: establish initial runtime rebuild baseline
```

This codebase is no longer a handoff skeleton. It contains a working first-pass
runtime for Chat, Vision, AIGC, local storage, import/export, ModelScope API
routes, offline probe scripts, and a minimal smoke script.

## Engineering Standard

The rebuild documents are the engineering guide, not a mechanical checklist.
The strict parts are:

```text
Runtime behavior
User data safety
Model capability semantics
Explicit parameter sending
Provider/runtime separation
```

Implementation shape may stay flexible when a simpler or more maintainable
approach serves the same product and engineering goal.

## Landed

```text
Conversation runtime unifies Chat and Vision.
Conversation requests are streamed by default.
Runtime does not probe or retry alternate thinking formats.
Optional behavior parameters are explicit-send.
AIGC uses async task submission and polling.
Storage is local-first with versioned state.
Export/import omits the ModelScope token.
Probe remains a local developer tool.
```

## Active Polish Direction

```text
Use built-in model profiles to gate known image input capabilities.
Keep custom model IDs permissive but explicit.
Store tokens under the secrets boundary.
Recover storage sections independently during migration.
Persist AIGC active task request metadata for refresh recovery.
Improve ModelScope error classification as real failures are observed.
Enhance probe reports without importing probe behavior into runtime.
```

## Deferred

```text
Frontend visual polish and animation tuning
Large test framework setup
Online model discovery
Runtime model probing
Multi-provider abstraction
Account system or cloud sync
AIGC workflow/canvas features
```
