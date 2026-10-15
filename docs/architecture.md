# Architecture

```text
Synthetic JSON records
        │
        ▼
 validation + text normalization
        │
        ├──────────────┐
        ▼              ▼
   BM25 ranking   E5 embeddings
        │              │
        └──────┬───────┘
               ▼
     Reciprocal Rank Fusion
               │
               ▼
          JSON results

 OpenClaw skill ─┐
                 ├── invokes the same CLI/core
 Claude Code skill┘
```

The CLI is the only implementation of validation, indexing, retrieval, and
fusion. Runtime adapters contain instructions, not duplicated business logic.
That boundary lets the same repository work from a terminal, OpenClaw, Claude
Code, CI, or another tool able to execute Node.js commands.

`mock` semantic mode is deterministic and exists only for fast tests. Real use
selects the pinned `Xenova/multilingual-e5-small` revision with `--semantic=e5`.
