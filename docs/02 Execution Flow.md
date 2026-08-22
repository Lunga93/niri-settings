---
tags: [execution-flow, diagrams]
up: "[[00 Home]]"
---

# 02 Execution Flow

All flows verified against the code (Aug 2026). Companion notes: [[01 Architecture]], [[03 Development Guide]].

## 1. App startup

```mermaid
sequenceDiagram
    autonumber
    participant T as Tauri runtime (Rust)
    participant V as Vite dev server :1420
    participant R as React app
    participant S as Sidecar process (Go)
    participant F as Filesystem

    Note over T,V: npm run tauri dev — beforeDevCommand starts Vite,<br/>cargo builds & launches the shell
    T->>V: WebView loads http://localhost:1420
    V->>R: index.html → main.tsx
    R->>R: ErrorBoundary wraps SettingsLoader (App.tsx)
    R->>R: useEffect fires loadSettingsAtom (lib/atoms.ts)
    R->>T: invoke("sidecar_command", read_settings)
    T->>S: spawn exe-dir/niri-settings-sidecar<br/>write JSON to stdin, close stdin (EOF)
    S->>F: read ~/.config/dotfiles/settings.json
    F-->>S: file contents (or "{}" when missing)
    S-->>T: {ok:true, data:"{…}"} on stdout, exit
    T-->>R: data string
    R->>R: JSON.parse → SettingsDataSchema.safeParse → set(settingsAtom)
    R->>R: AppLayout picks page via activePageAtom,<br/>Sidebar + TitleBar + AnimatePresence render
```

Startup is **failure-tolerant**: if settings are unreadable or fail zod validation, `readSettings` returns `null` and defaults (`SettingsDataSchema.parse({})`) stay in place — the app still opens. But if the *sidecar binary itself* is missing, every command fails with `Failed to spawn sidecar`.

## 2. Settings change pipeline (the core loop)

```mermaid
flowchart TD
    A["User interacts with a control"] --> B["Write-atom called<br/>setSettingsFieldAtom / setAccentColorAtom / …<br/>(src/lib/atoms.ts)"]
    B --> C["set(settingsAtom, next)<br/>jotai state update"]
    C --> D["React re-render (instant UI)"]
    B --> E["writeSettings(next)<br/>fire-and-forget promise"]
    B --> F["triggerSideEffects(section)"]
    E --> G["invokeRaw write_settings"]
    G --> H["Rust spawns Go sidecar<br/>stdin: JSON request"]
    H --> I["handleWriteSettings:<br/>write ~/.config/dotfiles/settings.json"]
    I --> J["auto: ReloadQuickshell<br/>qs ipc call settings reload"]
    F --> K{"section?"}
    K -- display --> L["execScript apply-display-scale,<br/>night-light (~/.local/bin)"]
    K -- icons --> M["gsettings icon-theme / cursor-theme / cursor-size"]
    K -- appearance --> N["execScript apply-theme $(cat ~/.config/current_wallpaper)"]
    K -- other --> O["no-op"]
```

Key properties:

- **Optimistic UI** — atoms update immediately; disk persistence is asynchronous ("fire-and-forget", errors only logged).
- **Persistence is centralised** in the write-atoms; pages/components never call services directly for saves.
- **Side effects** are keyed by settings section in one switch (`src/lib/atoms.ts`, `triggerSideEffects`).

## 3. Sidecar request lifecycle (protocol detail)

```mermaid
sequenceDiagram
    autonumber
    participant TS as services.ts / sidecar.ts
    participant RS as Rust lib.rs sidecar_command
    participant GO as Go sidecar

    TS->>RS: invoke("sidecar_command", {command, args})
    RS->>RS: resolve path = current_exe dir + "niri-settings-sidecar"
    alt binary missing
        RS-->>TS: Err("Failed to spawn sidecar …")
    end
    RS->>GO: spawn, stdin ← {"command":…,"args":…}, stdin closed
    GO->>GO: ReadAll(stdin) → unmarshal Request → switch(command)
    alt success
        GO-->>RS: stdout {"ok":true,"data":…}, exit 0
        RS-->>TS: Ok(data)
        TS->>TS: zod safeParse → typed result<br/>(fail ⇒ SCHEMA_VALIDATION_ERROR)
    else handler error
        GO-->>RS: stdout {"ok":false,"error":{code,message}}, may exit 1
        RS-->>TS: Err(message)
    else non-zero exit without valid JSON
        GO-->>RS: stderr text
        RS-->>TS: Err("Sidecar exited with status …")
    end
    TS->>TS: normalizeError → AppError{code,message,details}<br/>services catch and return null/false
```

## 4. Page navigation

Trivial by design — no router library:

```mermaid
flowchart TD
    Click["Sidebar item click"] --> A["activePageAtom.set(pageId)"]
    A --> B["AppLayout looks up PAGE_COMPONENTS id"]
    B --> C["AnimatePresence cross-fade<br/>+ per-page ErrorBoundary"]
```

The registry lives in `src/components/layout/AppLayout.tsx` (`PAGE_COMPONENTS`); sidebar structure in `src/stores/appAtoms.ts` (`SIDEBAR_SECTIONS`). Adding a page = component in `src/pages/` + one entry in each map.
