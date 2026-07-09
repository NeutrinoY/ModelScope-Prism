# Clean Migration Plan

## Purpose

This document defines how `rebuild-clean` should be rebuilt from the clean
baseline:

```text
c100260c51df6fd9c373fc9e789dc9801e5f0741
```

The current `rebuild` branch at:

```text
dd423d09b535bb679fd1a9845dc73238083d54b6
```

is a reference for product and semantic intent only. Its implementation shape
must not be copied mechanically.

The goal is not to remove polish. The goal is to preserve the baseline's
systemic code quality, architectural boundaries, and visual taste while
bringing forward the changes that are genuinely useful.

## Baseline Standard

The baseline is the style and architecture standard.

It should be treated as:

```text
The system shape
The code taste reference
The animation and interaction language reference
The boundary reference for contracts, domain, provider, storage, services, and UI
```

It should not be treated as:

```text
A frozen feature set
A reason to keep rough sidebar interactions
A reason to remove subtle motion
A reason to make the interface more rigid or less refined
```

The baseline motion system is already fluid, layered, and elegant. New work
must preserve that quality. The problem in the current `rebuild` branch is not
"too much motion" in general. The problem is ad hoc motion: local transforms,
private animation states, and one-off transitions that do not feel like part of
the same system.

## Design And Motion Taste

New UI work should feel like a continuation of the baseline.

Allowed:

```text
Soft opacity transitions
Subtle panel, sheet, dialog, and workspace motion
Token-driven duration and easing
Layout motion where it expresses a real spatial relationship
Polished hover, focus, active, disabled, and loading states
Small visual refinements that make rough baseline edges feel finished
```

Avoid:

```text
Ad hoc 2px hover translations on list text, badges, or overlay labels
Large local animation systems inside ordinary list items
transition-all everywhere
Component-private state created only to support decorative animation
Shake feedback
Brand or marketing copy that changes the utility-workbench tone
Visual effects whose purpose is not legible from the interaction
```

A useful rule:

```text
Color, border, background, shadow, and opacity should handle most hover/focus states.
Movement should be reserved for panels, sheets, dialogs, workspace changes, and
other interactions with a real spatial meaning.
```

## Migration Principle

Do not migrate diffs. Migrate intent.

Every candidate change from `dd423d09` must answer:

```text
1. What real baseline problem does this solve?
2. Is the problem in scope for docs/rebuild?
3. Which layer owns the solution?
4. What is the simplest implementation that still feels as polished as baseline?
```

If the answer is only "it looks a little more animated" or "the Agent added it",
the change should not be migrated.

## Source Of Truth

Use these as facts:

```text
docs/rebuild/00-rebuild-direction.md
docs/rebuild/01-product-and-information-architecture.md
docs/rebuild/03-aigc-module-requirements.md
docs/rebuild/04-conversation-module-requirements.md
docs/rebuild/05-interface-contract.md
docs/rebuild/06-storage-and-config-schema.md
docs/rebuild/07-core-and-provider-organization.md
docs/rebuild/08-frontend-organization.md
docs/rebuild/09-visual-and-interaction-guidelines.md
docs/rebuild/10-technology-stack-and-dependency-decisions.md
docs/rebuild/11-implementation-brief.md
```

Do not use as facts:

```text
docs/rebuild/code-quality-review.md from the current rebuild branch
Claude worktree branches
Uncommitted worktree experiments
Agent-generated self-review text
```

## Scope For Phase 1

Phase 1 should migrate only changes that are clearly justified.

### Keep And Reimplement

These intents are valid and should be implemented in a baseline-consistent way:

```text
Move token state under a secrets boundary
Correctly preserve or migrate existing apiKey data
Persist activeImageTask.requestMeta for AIGC refresh recovery
Store generated image requestMeta from the actual sent request
Add AIGC request body soft limit before submit
Improve probe cooldown and Retry-After handling
Make probe report classification more conservative for unknown outcomes
Gate known image input capability in UI without runtime probing
Tighten thinking format selection for built-in and custom model profiles
Improve retry semantics beyond just clearing the error
Clear AIGC image inputs after successful task submit
Show cross-session AIGC generation state clearly
Add generated image download support
Improve sidebar rename with explicit save and cancel
Move sidebar close action into the list header
Restore a low-presence sidebar footer in the new visual language
```

### Do Not Migrate In Phase 1

These are not part of the first clean migration:

```text
streamdown
@streamdown/cjk
React Compiler
Turbopack root adjustment unless a concrete local issue requires it
ErrorNotice shake animation
Viewer retained-image state for close animation
SessionList AnimatePresence text crossfade
2px hover translations
Large one-off overlay animation systems
docs/rebuild/code-quality-review.md
Agent-generated status document as-is
```

These can be revisited after Phase 1 if a real visual or runtime problem is
observed.

## Streamdown Decision

`streamdown` is a credible package and its positioning matches AI streaming
Markdown. It is not low quality by default.

However, in this project it is too heavy to include as part of Phase 1:

```text
The rebuild docs explicitly start from react-markdown and remark-gfm.
The current app already has a Markdown rendering stack.
streamdown adds another Markdown and rendering dependency chain.
The current rebuild branch mixes this dependency decision with unrelated UI work.
The actual need is not yet proven by a focused visual or performance review.
```

Default decision:

```text
Do not migrate streamdown in Phase 1.
Keep react-markdown, remark-gfm, and react-syntax-highlighter.
Evaluate streamdown later in a dedicated commit if streaming Markdown quality is
visibly insufficient.
```

If streamdown is introduced later, it must be isolated inside
`MarkdownRenderer`, include a short dependency rationale, and remain easy to
revert.

## Sidebar Direction

The baseline sidebar is architecturally clean but visually and interactionally
rough. It should be polished, not redesigned.

Keep:

```text
Workspace-specific session list
Create session button
Session select
Rename
Delete confirmation
Active session state
Hover and focus action discoverability
Mobile sheet close action
Low-presence footer
```

Improve:

```text
Rename should support explicit save and cancel
Enter saves and Escape cancels
Buttons should not visually fight the session title
Header actions should be aligned and reusable
Focus state should be clear
Spacing and borders should feel finished
Footer should match the new token system
```

Do not use:

```text
Motion for ordinary rename text switching
Hover translate effects
Hard-coded decorative subtitles
Multiple local transition systems
```

Footer target:

```text
ModelScope Prism 2.0
```

It should be one low-contrast line at the bottom of the sidebar, inspired by
the legacy footer but styled for the rebuilt system.

## Error Notice Direction

Keep:

```text
Clear user-facing error message
Error code and request id details
Open Settings for token errors
Retry affordance for recoverable errors
Retrying state when a retry is in progress
```

Do not use:

```text
Shake animation
Cached activeError state only for animation
Stale error display mechanics
```

The component should remain primarily props-driven. Any retry behavior belongs
to the workspace runner or task hook, not to the error display component.

## Image Viewer Direction

Keep:

```text
Open generated image
Navigate previous and next
Copy prompt
Download image
Close viewer
Keyboard navigation
Boundary disabled states
```

Do not migrate retained-image state in Phase 1.

Reason:

```text
Retaining the previous image during close animation creates two sources of truth:
props.image and state.displayedImage.
```

Start with the simpler model. If visual review shows that closing the viewer
causes obvious content flicker, then add a small presentational retention layer
that does not affect navigation or business state.

## Storage Direction

Storage changes must be handled more carefully than the current rebuild branch.

Required:

```text
Existing local apiKey must not disappear.
Current and legacy persisted state must normalize through one clear path.
Malformed settings should not erase valid sessions.
activeSessionByWorkspace must only point to sessions of the matching type.
activeImageTask must only be restored when its image session still exists.
Import must continue to omit secrets and activeImageTask.
```

Important:

```text
Do not write a migration that only works when Zustand's persist version changes
if the version does not actually change.
```

Use either a real version bump or a merge/normalization path that runs during
hydration for same-version persisted data.

## Dependency Direction

Do not mix dependency changes with feature work.

Phase 1 should not migrate:

```text
streamdown
@streamdown/cjk
babel-plugin-react-compiler
reactCompiler: true
```

Future dependency commits must include:

```text
Use location
Problem solved
Alternative
Why existing stack is insufficient
Rollback cost
Bundle or runtime consideration
```

## Commit Strategy

Use small commits with one intent each.

Recommended sequence:

```text
1. storage secrets and hydration correctness
2. active image task request metadata
3. AIGC request body limit and submit cleanup
4. probe cooldown and report conservatism
5. conversation thinking and image input gating
6. retry semantics
7. sidebar polish and footer
8. image viewer download and navigation polish
9. README or status documentation, if needed
```

Do not combine:

```text
Dependency changes with UI polish
Storage migration with visual edits
Docs self-review with runtime changes
Lockfile churn with unrelated code
```

## Verification

After each meaningful phase:

```text
pnpm typecheck
pnpm check
pnpm build
```

If external ModelScope calls are involved, use smoke or probe only when the
change requires it and token/quota cost is acceptable.

## Merge Strategy

The clean branch should be reviewed as the replacement implementation for the
current mixed `rebuild` line.

Preferred:

```text
Merge or replace with rebuild-clean after approval.
Avoid cherry-picking low-quality implementation details from dd423d09.
```

If the existing `rebuild` branch already contains unwanted commits and history
rewrite is acceptable, prefer replacing that branch with the clean line after
tagging or otherwise preserving the old state.
