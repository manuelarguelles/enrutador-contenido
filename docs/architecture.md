# Architecture

![Content Router architecture](architecture.png)

Open and edit the source in [diagrams.net](https://app.diagrams.net/) using
[`architecture.drawio`](architecture.drawio). Its layout specification is
available as [`architecture-spec.json`](architecture-spec.json).

The CLI is the only implementation of validation, indexing, retrieval, and
fusion. Runtime adapters contain instructions, not duplicated business logic.
That boundary lets the same repository work from a terminal, OpenClaw, Claude
Code, CI, or another tool able to execute Node.js commands.

`mock` semantic mode is deterministic and exists only for fast tests. Real use
selects the pinned `Xenova/multilingual-e5-small` revision with `--semantic=e5`.

The dashed trust boundaries separate people, optional runtime integrations,
the shared Node.js core, model acquisition, local persistence, and output.
Dashed arrows are supporting relationships; the primary request path reads
from left to right.

## Decision path

Classification is a separate, optional path after content retrieval:

```text
title + summary
      │
      ▼
Jev choice + probabilities
      │
      ▼
deterministic policy ── confidence ≥ threshold ──► auto
      │
      └──────── low/unknown/uncalibrated ─────────► ask human
```

The provider proposes a category; repository code owns the final policy. This
keeps the autonomy boundary deterministic, testable, and reversible. The
engine fails closed when content is insufficient, the provider returns an
unknown category, or no calibrated threshold exists. Alternative categories,
confidence, reason, provider, model, and usage stay available as audit data.

Only `title` and `summary` cross the third-party boundary. Retrieval records,
analysis, source media, identities, sessions, and local credentials do not.
