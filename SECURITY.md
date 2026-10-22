# Security policy

## Supported version

Only the latest release on `main` is supported.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting feature. Do not include
credentials, private records, personal memory, session exports, or production
configuration in a public issue.

## Data and secrets boundary

This repository is intentionally credential-free. Runtime secrets belong in
the host environment or its secret store, never in committed files. The
included records are synthetic and use `example.com` URLs.

Jev is optional. Its key is read only from `JEV_API_KEY` at runtime and must
never be committed. The decision engine sends only a caller-provided title and
summary to `https://api.typesafe.ai`; it does not send source media, analysis,
records, identity, memory, sessions, or local configuration. Provider errors
fail closed and never become automatic classifications.

The OpenClaw adapter installs one project skill only. It never installs or
replaces identity, personality, user profiles, memory, sessions, channels,
providers, credentials, or global instructions. The Claude Code adapter is
also project-scoped and does not modify user-level configuration.

Before publishing a change, run:

```bash
npm run verify
npm audit --omit=dev --audit-level=high
```
