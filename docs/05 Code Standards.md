---
tags: [standards, conventions]
---

# 05 Code Standards

## Non-negotiables

1. **zod schemas are the contract.** Every shape crossing IPC is a zod schema in `src/lib/schemas/<domain>.ts`. Never trust raw JSON.
2. **Services never throw.** Catch internally, return `null`/`false`, log via `sidecarLogger`. Only `lib/ipc/client.ts` throws `AppError`s.
3. **Errors are structured:** `{code, message, details}` end-to-end (Go → Rust → TS).
4. **Rust stays thin.** One command that pipes JSON. New system capabilities go in the Go sidecar.
5. **State changes go through write-atoms.** Components never call services to save.
6. **No inline SVGs.** Use `lucide-react`.

## Layer rules

| Layer | May import from | Must not |
|-------|-----------------|----------|
| `pages/`, `components/` | `@/stores`, `@/lib/services`, UI libs | call `@tauri-apps/api` directly |
| `lib/services/<domain>.ts` | `lib/ipc`, `lib/schemas`, `lib/logger` | touch jotai atoms |
| `lib/ipc/client.ts` | `@tauri-apps/api/core`, schemas | know about specific commands |
| `stores/<domain>.ts` | `lib/services`, `lib/schemas` | touch the DOM outside theme application |

New domains get modules in `stores/`, `lib/services/`, and `lib/schemas/`. Tests in per-concern `__tests__/` dirs.

## Quality gates

| Gate | Command |
|---|---|
| Tests | `npm test` |
| Lint (auto-fix) | `npm run lint` |
| Types | `npm run typecheck` |
| Format | `npm run format` |
| Pre-commit | husky + lint-staged (automatic) |

## Accepted limitations

- `security.csp` is `null` — fine for a local tool.
- No sidecar timeout; handlers are quick file/CLI ops.
- Settings persist twice (localStorage + disk JSON); disk wins at startup.
- niri parsing is regex-based — will break if niri changes output format.
- zod strips unknown keys; new fields in `settings.json` must be declared in `src/lib/schemas/<domain>.ts` or they vanish on next save.

The authoritative reference for file locations and architecture is [`AGENTS.md`](../AGENTS.md).
